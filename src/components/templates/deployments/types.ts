type TDeployment = {
    address: string | undefined;
    contractFunds: any;
    maxSupply: number | undefined;
    totalSupply: number | undefined;
    tokenUri: string | undefined;
    name: string | undefined;
    mintCost: any;
    managingAddress: string | undefined;
    paymentContractAddress: string | undefined;
    withdrawable: string | undefined;
  };
  export interface IDeployments {
    deployments?: TDeployment[];
  }
  