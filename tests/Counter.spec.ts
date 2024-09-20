import { Blockchain, SandboxContract, Treasury, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { mnemonicToWalletKey } from "ton-crypto";
import Counter from '../wrappers/Counter';

describe('Counter', () => {
    let code: Cell;
    let walletSender: Treasury;
    let blockchain: Blockchain;
    beforeAll(async () => {
        code = await compile('Counter');

        blockchain = await Blockchain.create();
        const wallet = (await blockchain.createWallets(1, {
            workchain: 0,
            predeploy: true,
            balance: BigInt(300),
            resetBalanceIfZero: false
        }))[0]
        walletSender = wallet.getSender();
    });


    let deployer: SandboxContract<TreasuryContract>;
    let counter: SandboxContract<Counter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        counter = blockchain.openContract(Counter.createForDeploy(code, Date.now()));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await counter.sendDeploy(deployer.getSender());
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy get counter', async () => {
        const counterValue = await counter.getCounter();
        expect(counterValue).toBeGreaterThan(0);
    });

    it('should deploy send increment', async () => {
        const incrementResult = await counter.sendIncrement(walletSender);
        expect(incrementResult.transactions).toStrictEqual([]);
    });

    it('should deploy send decrement', async () => {
        const decrementResult = await counter.sendDecrement(walletSender);
        expect(decrementResult.transactions).toStrictEqual([]);
    });
});
