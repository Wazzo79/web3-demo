import { Default } from 'components/layouts/Default';
import { GetServerSideProps, NextPage } from 'next';
import { getSession } from 'next-auth/react';
import { ethers } from "ethers";
import { IDeployments, Deployments } from 'components/templates/deployments';
import Moralis from 'moralis';
import Web3 from 'web3';

const DeploymentsPage: NextPage<IDeployments> = (props) => {

  
  return (
    <Default pageName="Deployments">
      <Deployments {...props} />
    </Default>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  await Moralis.start({ apiKey: process.env.MORALIS_API_KEY });

  if (!session?.user.address) {
    return { props: { error: 'Connect your wallet first' } };
  }


  const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth_rinkeby");

  const abiFactory = require('abis/abiFactory.json');
  const contract = new ethers.Contract("0x67Ec2287ff825eA0004bdf44Ce15569F8926ba64", abiFactory, provider);

  const deployedContracts = await contract.getDeployedContracts();
  const abiContent = require('abis/abiContent.json');

  let deployments: any[] = [];
  
  for (let m of deployedContracts) {
    const contentContract = new ethers.Contract(m, abiContent, provider);
    const totalSupply = await contentContract.totalSupply();
    const managingAddress = await contentContract.managingAddress();
    const maxSupply = await contentContract.maxSupply();
    const name = await contentContract.name();
    const mintCost = await contentContract.mintCost();
    const creatorPaymentAddress = await contentContract.creatorPaymentContractAddress();
    const balance = ethers.utils.formatEther(await provider.getBalance(creatorPaymentAddress));
  
    

    deployments.push({
      address: m,
      contractFunds: balance.toString(),
      paymentContractAddress: creatorPaymentAddress,
      managingAddress: managingAddress,
      maxSupply: maxSupply.toString(),
      mintCost: mintCost.toString(),
      name: name,
      totalSupply: totalSupply.toString()
    });
  }

  return {
    props: {
      deployments: deployments,
    },
  };
};

export default DeploymentsPage;
