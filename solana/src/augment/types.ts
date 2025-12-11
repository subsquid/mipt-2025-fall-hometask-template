import {
    Base58Bytes,
    Bytes,
    GetBalance,
    GetBlockHeader,
    GetInstruction,
    GetTokenBalance,
    GetTransaction
} from 'core/portal/data'


export interface AugmentBlockBase {
    header: object
    transactions?: TransactionBase[]
    instructions?: InstructionBase[]
    balances?: BalanceBase[]
    tokenBalances?: TokenBalanceBase[]
}


export interface TransactionBase {
    transactionIndex: number
}


export interface InstructionBase {
    transactionIndex: number
    instructionAddress: number[]
    data?: Base58Bytes
}


export interface TokenBalanceBase {
    transactionIndex: number
}


export interface BalanceBase {
    transactionIndex: number
}


/**
 * Portal block where all items are augmented with references to related objects
 * and with additional helper methods.
 */
export type AugmentBlock<B extends AugmentBlockBase> = {
    header: GetBlockHeader<B>
    transactions: AugmentedTransaction<B>[]
    instructions: AugmentedInstruction<B>[]
    balances: AugmentedBalance<B>[]
    tokenBalances: AugmentedTokenBalance<B>[]
}


export type AugmentedTransaction<B> = GetTransaction<B> & {
    block: GetBlockHeader<B>
    instructions: AugmentedInstruction<GetInstruction<B>>[]
    tokenBalances: AugmentedTokenBalance<B>[]
}


export type AugmentedInstruction<B> = GetInstruction<B> & {
    block: GetBlockHeader<B>
    transaction?: AugmentedTransaction<B>
    getTransaction(): AugmentedTransaction<B>
    inner: AugmentedInstruction<B>[]
    getHexData(): Bytes
    d1: Bytes
    d2: Bytes
    d4: Bytes
    d8: Bytes
    d16: Bytes
}


export type AugmentedBalance<B> = GetBalance<B> & {
    block: GetBlockHeader<B>
    transaction?: AugmentedTransaction<B>
    getTransaction(): AugmentedTransaction<B>
}


export type AugmentedTokenBalance<B> = GetTokenBalance<B> & {
    block: GetBlockHeader<B>
    transaction?: AugmentedTransaction<B>
    getTransaction(): AugmentedTransaction<B>
}
