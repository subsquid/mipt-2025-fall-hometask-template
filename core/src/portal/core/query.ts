import type {EvmBlock} from './query/evm/fields'
import type {EvmQuery} from './query/evm/query'
import type {SolanaBlock} from './query/solana/fields'
import type {SolanaQuery} from './query/solana/query'


export type * from './query/common/query'
export type * from './query/evm/query'
export type * from './query/solana/query'


export type GetQueryBlock<Q> =
    Q extends EvmQuery<infer F>
        ? EvmBlock<F>
        : Q extends SolanaQuery<infer F>
            ? SolanaBlock<F>
            : never


export type AnyQuery = EvmQuery | SolanaQuery
