import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";
import { compile, NetworkProvider } from '@ton/blueprint';

import Counter from "../wrappers/Counter"; // this is the interface class from step 7

export async function run(provider: NetworkProvider) {
  // initialize ton rpc client on testnet
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  // prepare Counter's initial code and data cells for deployment
  const initialCounterValue = Date.now(); // to avoid collisions use current number of milliseconds since epoch as initial value
  const counter = provider.open(
    Counter.createForDeploy(
        await compile('Counter'),
        initialCounterValue,
    ),
);

await counter.sendDeploy(provider.sender());

await provider.waitForDeploy(counter.address);

console.log("contract address:", counter.address.toString());

// run contract methods
const counterValue = await counter.getCounter();
console.log("value:", counterValue.toString());
}
