import { Address, beginCell, Cell, OpenedContract, toNano } from '@ton/core';
import { TonClient, TonClient4 } from '@ton/ton';
import { compile, NetworkProvider, UIProvider } from '@ton/blueprint';
import Counter from '../wrappers/Counter';
import { promptAddress, waitForTransaction } from '../wrappers/ui-utils';

let counterContract: OpenedContract<Counter>;

const userActions = ['Increment', 'Decrement', 'Get Counter Value', 'Quit'];

const failedTransMessage = (ui: UIProvider) => {
    ui.write("Failed to get indication of transaction completion from API!\nCheck result manually, or try again\n");
};

const getCounterValueAction = async (ui: UIProvider) => {
    const value = await counterContract.getCounter();
    ui.write(`Current counter value: ${value}\n`);
};

const incrementAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const api = provider.api();
    if (!(api instanceof TonClient)) {
        throw new Error("Provider API is not an instance of TonClient");
    }

    const contractState = await api.getContractState(counterContract.address);

    if (contractState.lastTransaction === null)
        throw new Error("Last transaction can't be null on deployed contract");

    await counterContract.sendIncrement(provider.sender());
    const transDone = await waitForTransaction(provider,
        counterContract.address,
        contractState.lastTransaction.lt,
        100);

    if (transDone) {
        const newValue = await counterContract.getCounter();
        ui.write(`Counter incremented. New value: ${newValue}\n`);
    } else {
        failedTransMessage(ui);
    }
};

const decrementAction = async (provider: NetworkProvider, ui: UIProvider) => {
    const api = provider.api();
    if (!(api instanceof TonClient)) {
        throw new Error("Provider API is not an instance of TonClient");
    }

    const contractState = await api.getContractState(counterContract.address);

    if (contractState.lastTransaction === null)
        throw new Error("Last transaction can't be null on deployed contract");

    await counterContract.sendDecrement(provider.sender());
    const transDone = await waitForTransaction(provider,
        counterContract.address,
        contractState.lastTransaction.lt,
        100);

    if (transDone) {
        const newValue = await counterContract.getCounter();
        ui.write(`Counter decremented. New value: ${newValue}\n`);
    } else {
        failedTransMessage(ui);
    }
};

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const api = provider.api();
    const counterCode = await compile('Counter');
    let done = false;
    let retry: boolean;
    let counterAddress: Address;

    if (!(api instanceof TonClient)) {
        throw new Error("Provider API is not an instance of TonClient");
    }

    do {
        retry = false;
        counterAddress = await promptAddress('Please enter Counter contract address:', ui);
        const contractState = await api.getContractState(counterAddress);
        
        if (contractState.state !== "active" || contractState.code == null) {
            retry = true;
            ui.write("This contract is not active!\nPlease use another address, or deploy it first");
        } else if (contractState.state === "active") {
            const stateCode = Cell.fromBoc(contractState.code)[0];
            if (!stateCode.equals(counterCode)) {
                ui.write("Contract code differs from the current contract version!\n");
                const resp = await ui.choose("Use address anyway", ["Yes", "No"], (c) => c);
                retry = resp == "No";
            }
        }
    } while (retry);

    counterContract = provider.open(Counter.createFromAddress(counterAddress));

    do {
        const action = await ui.choose("Pick action:", userActions, (c) => c);
        switch (action) {
            case 'Increment':
                await incrementAction(provider, ui);
                break;
            case 'Decrement':
                await decrementAction(provider, ui);
                break;
            case 'Get Counter Value':
                await getCounterValueAction(ui);
                break;
            case 'Quit':
                done = true;
                break;
        }
    } while (!done);
}

//my contract address on testnet: EQA5ABebvTM3MQC_LuUQK2h-3antH4tcCMsaRhSWt1qzkxPU