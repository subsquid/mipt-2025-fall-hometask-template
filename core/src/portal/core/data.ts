export type * from './query/common/data'
export type * from './query/evm/fields'
export type * from './query/solana/fields'


export type GetTransaction<B> = B extends {transactions?: (infer T)[]} ? T : never
export type GetLog<B> = B extends {logs?: (infer T)[]} ? T : never
export type GetTrace<B> = B extends {traces?: (infer T)[]} ? T : never
export type GetStateDiff<B> = B extends {stateDiffs?: (infer T)[]} ? T : never
export type GetInstruction<B> = B extends {instructions?: (infer T)[]} ? T : never
export type GetBalance<B> = B extends {balances?: (infer T)[]} ? T : never
export type GetTokenBalance<B> = B extends {tokenBalances?: (infer T)[]} ? T : never
export type GetReward<B> = B extends {reward?: (infer T)[]} ? T : never
