import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Heading,
  Box,
  useColorModeValue,
  Button,
  Link,
  HStack,
  VStack,
  Stack,
} from '@chakra-ui/react';
import { DeployContract } from 'components/modals/deployContract';
import MintModal from 'components/modals/mintModal';
import { FC, useEffect, useState } from 'react';
import { getEllipsisTxt } from 'utils/format';
import Web3 from 'web3';
import { IDeployments } from './types';

declare let window: any;
let web3: Web3;

const abiSharePayment = require('abis/abiSharePayment.json');

const Deployments: FC<IDeployments> = ({ deployments }) => {
  const hoverTrColor = useColorModeValue('gray.100', 'gray.700');
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onConnect();
  }, []);

  const detectCurrentProvider = () => {
    let provider;
    if (window.ethereum) {
      provider = window.ethereum;
    } else if (window.web3) {
      provider = window.web3.currentProvider;
    } else {
      console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
    }
    return provider;
  };

  const onConnect = async () => {
    try {
      const currentProvider = detectCurrentProvider();
      if (currentProvider) {
        if (currentProvider !== window.ethereum) {
          console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
        }
        await currentProvider.request({ method: "eth_requestAccounts" });
        web3 = new Web3(currentProvider);

        const userAccount = await web3.eth.getAccounts();
        setAccount(userAccount[0]);


        window.ethereum.on("accountsChanged", function (accounts: any) {
          accounts[0] === undefined ? setAccount("") : setAccount(accounts[0]);
        });
      }
    } catch (err) {
      console.log("There was an error fetching your accounts. Make sure your Ethereum client is configured correctly.");
    }
  };

  const redeem = async (paymentContractAddress: string | undefined) => {
    if (paymentContractAddress) {
      setLoading(true);

      var paymentContract = new web3.eth.Contract(abiSharePayment, paymentContractAddress);
      await paymentContract.methods.redeem().send({ from: account });

      setLoading(false);
    }
  };

  const withdraw = async () => {
    try {
    setLoading(true);
    const abiPayment = require('abis/abiPayments.json');
    const paymentContract = new web3.eth.Contract(abiPayment, "0x356c11Baa5286D36001DF1396005B2aA51fcA750");

    await paymentContract.methods.withdraw().send({ from: account });
    setLoading(false);
    }
    catch {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack>
      <Button bgColor='purple' isLoading={loading} alignSelf="end" onClick={() => withdraw()}>Withdraw</Button>
      </Stack>
      
      <Heading size="lg" marginBottom={6}>
        Deployments

        <DeployContract></DeployContract>
      </Heading>
      {deployments?.length ? (
        <Box border="2px" borderColor={hoverTrColor} borderRadius="xl" padding="24px 18px">
          <TableContainer w={'full'}>
            <Table>
              <Thead>
                <Tr>
                  <Th>Contract Address</Th>
                  <Th>Links</Th>
                  <Th>Mint Cost</Th>
                  <Th>Supply</Th>
                  <Th>Redeemable</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {deployments?.map((contract, key) => (
                  <Tr key={key} _hover={{ bgColor: hoverTrColor }} cursor="pointer">
                    <Td>{getEllipsisTxt(contract?.address || '')}</Td>
                    <Td>
                      <VStack>
                        <Link href={`https://rinkeby.etherscan.io/address/${contract?.address}`} target="_blank">Etherscan</Link>
                        <Link href={`https://testnets.opensea.io/assets/rinkeby/${contract?.address}`} target="_blank">Opensea</Link>
                        <Link href={`https://testnet.rarible.com/collection/${contract?.address}`} target="_blank">Rarible</Link>
                      </VStack>
                    </Td>
                    <Td>{web3 ? web3.utils.fromWei(contract?.mintCost) : ''} ETH</Td>
                    <Td>{contract?.totalSupply} / {contract?.maxSupply}</Td>
                    <Td>{contract?.contractFunds} ETH</Td>
                    <Td>
                      <HStack>
                        <MintModal
                          account={account}
                          nftContract={contract?.address}
                          web3={web3}
                          mintCost={contract?.mintCost}
                        />
                        <Button bgColor='blue' isLoading={loading} disabled={!contract?.contractFunds} onClick={() => redeem(contract?.paymentContractAddress)}>Redeem</Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Box>Looks Like you do not have any deployments</Box>
      )}
    </>
  );
};

export default Deployments;
