import assert from 'assert'
import {runClickhouseProcessing} from 'core/clickhouse-processor'
import {Base58Bytes} from 'core/portal/data'
import {PortalDataSource} from 'core/portal/data-source'
import * as tokenProgram from './abi/token-program'
import * as whirlpool from './abi/whirlpool'
import {augmentBlock} from './augment'


/**
 * USDC-SOL swaps
 */
const source = new PortalDataSource(
    'https://portal.sqd.dev/datasets/solana-mainnet/finalized-stream',
    {
        type: 'solana',
        fromBlock: 385_000_000, // some recent block
        fields: {
            block: {
                timestamp: true
            },
            transaction: {
                transactionIndex: true,
                signatures: true
            },
            instruction: {
                transactionIndex: true,
                instructionAddress: true,
                programId: true,
                accounts: true,
                data: true
            },
            tokenBalance: {
                transactionIndex: true,
                account: true,
                preMint: true,
                postMint: true,
                preOwner: true,
                postOwner: true
            },
            balance: {
                transactionIndex: true
            }
        },
        instructions: [
            {
                programId: [whirlpool.programId],
                discriminator: [whirlpool.instructions.swap.d8],
                ...whirlpool.instructions.swap.accountSelection({
                    whirlpool: ['7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcUUz1JRdoVNUJnm']
                }),
                innerInstructions: true,
                transaction: true,
                transactionTokenBalances: true,
                isCommitted: true
            }
        ]
    }
)

runClickhouseProcessing({
    clickhouse: 'http://default:123@localhost:8123',
    clickhouseDatabase: 'whirlpool_src',
    source,
    map(inputBlock): Data {
        let data = new Data()
        let block = augmentBlock(inputBlock)
        for (let ins of block.instructions) {
            if (ins.programId === whirlpool.programId && ins.d8 === whirlpool.instructions.swap.d8) {
                assert(ins.inner.length == 2)

                let srcTransfer = tokenProgram.transfer.decode(ins.inner[0])
                let destTransfer = tokenProgram.transfer.decode(ins.inner[1])

                let srcBalance = ins.getTransaction().tokenBalances.find(tb => tb.account == srcTransfer.accounts.source)
                let destBalance = ins.getTransaction().tokenBalances.find(tb => tb.account === destTransfer.accounts.destination)

                let srcMint = ins.getTransaction().tokenBalances.find(tb => tb.account === srcTransfer.accounts.destination)?.preMint
                let destMint = ins.getTransaction().tokenBalances.find(tb => tb.account === destTransfer.accounts.source)?.preMint

                assert(srcMint)
                assert(destMint)

                data.swaps.push({
                    transaction_index: ins.transactionIndex,
                    transaction_hash: ins.getTransaction().signatures[0],
                    from_token: srcMint,
                    from_owner: srcBalance?.preOwner || srcTransfer.accounts.source,
                    from_amount: srcTransfer.data.amount.toString(),
                    to_token: destMint,
                    to_owner: destBalance?.postOwner || destBalance?.preOwner || destTransfer.accounts.destination,
                    to_amount: destTransfer.data.amount.toString()
                })
            }
        }
        return data
    }
})


class Data {
    swaps: Swap[] = []
}


interface Swap {
    transaction_index: number
    transaction_hash: string
    from_token: Base58Bytes
    from_owner: Base58Bytes
    from_amount: string
    to_token: Base58Bytes
    to_owner: Base58Bytes
    to_amount: string
}
