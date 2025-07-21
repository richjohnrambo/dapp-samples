import {
    createPublicClient,
    formatEther,
    http,
    publicActions,
    parseAbiItem,
    parseAbi,
} from "viem";
import { foundry } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

//在NFTMarket 合约中在上架（list）和买卖函数（buyNFT 及 tokensReceived）中添加相应事件，
//在后台监听上架和买卖事件，如果链上发生了上架或买卖行为，打印出相应的日志。

const LIST_EVENT = {
    type: 'event',
    name: 'List',
    inputs: [
        { type: 'address', name: 'from', indexed: true },
        { type: 'address', name: 'to', indexed: true },
        { type: 'uint256', name: 'value' }
    ]
} as const;

const BUY_EVENT = {
    type: 'event',
    name: 'Buy',
    inputs: [
        { type: 'address', name: 'owner', indexed: true },
        { type: 'address', name: 'spender', indexed: true },
        { type: 'uint256', name: 'value' }
    ]
} as const;

const main = async () => {
    // 创建公共客户端
    const publicClient = createPublicClient({
        chain: foundry,
        transport: http(process.env.RPC_URL!),
    }).extend(publicActions);

    console.log('开始扫描 ERC721 事件...');

    // 获取当前区块号
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`当前区块号: ${currentBlock}`);

    // 设置扫描范围（这里扫描最近 1000 个区块）
    // get fromBlock from db
    const fromBlock = 0n;
    const toBlock = currentBlock;

    try {
        // 监听所有 事件
        publicClient.watchEvent({
            address: '0x948B3c65b89DF0B4894ABE91E6D02FE579834F8F',
            events: parseAbi([
                'event Buy(address indexed owner, address indexed spender, uint256 value)',
                'event List(address indexed from, address indexed to, uint256 value)'
            ]),
            onLogs: (logs) => {
                logs.forEach((log) => {
                console.log('\n事件详情:');
                console.log(`事件类型: ${log.eventName}`);
                console.log(`合约地址: ${log.address}`);
                console.log(`交易哈希: ${log.transactionHash}`);
                console.log(`区块号: ${log.blockNumber}`);

                if (log.eventName === 'List' && log.args.value !== undefined) {
                    console.log(`从: ${log.args.from}`);
                    console.log(`到: ${log.args.to}`);
                    console.log(`金额: ${formatEther(log.args.value)}`);
                } else if (log.eventName === 'Buy' && log.args.value !== undefined) {
                    console.log(`所有者: ${log.args.owner}`);
                    console.log(`授权给: ${log.args.spender}`);
                    console.log(`授权金额: ${formatEther(log.args.value)}`);
                }
                });
            },
        });
        
    } catch (error) {
        console.error('监听过程中发生错误:', error);
    }
    console.log('监听已启动，等待事件发生...');

};

main().catch((error) => {
    console.error('发生错误:', error);
    process.exit(1);
}); 
