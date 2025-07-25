import { createWalletClient, http, parseEther, parseGwei, type Hash, type TransactionReceipt } from 'viem'
import { prepareTransactionRequest } from 'viem/actions'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { createPublicClient, type PublicClient, type WalletClient } from 'viem'
import dotenv from 'dotenv'


// 1.生成私钥、查询余额（可人工转入金额）
// 2.构建一个 ERC20 转账的 EIP 1559 交易
// 3.用 1 生成的账号，对 ERC20 转账进行签名
// 4.发送交易到 Sepolia 网络。

dotenv.config()

async function walletDemo(): Promise<Hash> {
  try {
    // const privateKey = generatePrivateKey()

    // 1. 从环境变量获取私钥
    console.log('get privateKey');
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`
    if (!privateKey) {
      throw new Error('请在 .env 文件中设置 PRIVATE_KEY')
    }

    // 使用助记词 推导账户
    // const account = mnemonicToAccount('xxxx xxx ') 
    // 使用私钥 推导账户
    const account: PrivateKeyAccount = privateKeyToAccount(privateKey)
    const userAddress = account.address
    console.log('账户地址:', userAddress)

    // 创建公共客户端
    const publicClient: PublicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.RPC_URL)
    })

    // 检查网络状态
    const blockNumber = await publicClient.getBlockNumber()
    console.log('当前区块号:', blockNumber)

    // 获取当前 gas 价格
    const gasPrice = await publicClient.getGasPrice()
    console.log('当前 gas 价格:', parseGwei(gasPrice.toString()))

    // 查询余额
    const balance = await publicClient.getBalance({
      address: userAddress
    })
    console.log('账户余额:', parseEther(balance.toString()))

    // 查询nonce
    const nonce = await publicClient.getTransactionCount({
      address: userAddress
    })
    console.log('当前 Nonce:', nonce)

    // 2. 构建交易参数
    const txParams = {
        account: account,
        to: '0x3E2FA9bB26Ea97D6534854bB0DF0100cf85a9fCf' as `0x${string}`, // 目标地址
        value: parseEther('0.001'), // 发送金额（ETH）
        chainId: sepolia.id,
        type: 'eip1559' as const, // 使用 const 断言确保类型正确
        chain: sepolia, // 添加 chain 参数
        
        // EIP-1559 交易参数
        maxFeePerGas: gasPrice * 2n, // 最大总费用为当前 gas 价格的 2 倍
        maxPriorityFeePerGas: parseGwei('0.002'), // 设置优先费用不超过最大费用
        gas: 21000n,   // gas limit
        nonce: nonce,
    }


    // 或 自动 Gas 估算 及参数验证和补充
    const preparedTx = await prepareTransactionRequest(publicClient, txParams)
    console.log('准备后的交易参数:', {
      ...preparedTx,
      maxFeePerGas: parseGwei(preparedTx.maxFeePerGas.toString()),
      maxPriorityFeePerGas: parseGwei(preparedTx.maxPriorityFeePerGas.toString()),
    })

    // 创建钱包客户端
    const walletClient: WalletClient = createWalletClient({
      account: account,
      chain: sepolia,
      transport: http(process.env.RPC_URL)
    })

    // 签名交易
    const signedTx = await walletClient.signTransaction(preparedTx)
    console.log('Signed Transaction:', signedTx)

    // 发送交易  eth_sendRawTransaction
    const txHash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx
    })
    console.log('Transaction Hash:', txHash)

    // 等待交易确认
    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    console.log('交易状态:', receipt.status === 'success' ? '成功' : '失败')
    console.log('区块号:', receipt.blockNumber)
    console.log('Gas 使用量:', receipt.gasUsed.toString())

    return txHash

  } catch (error) {
    console.error('错误:', error)
    if (error instanceof Error) {
      console.error('错误信息:', error.message)
    }
    if (error && typeof error === 'object' && 'details' in error) {
      console.error('错误详情:', error.details)
    }
    throw error
  }
}

// 执行示例
walletDemo() 