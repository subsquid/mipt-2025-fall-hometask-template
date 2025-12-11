import {Base58Bytes, Bytes} from 'core/portal/data'
import {getInstructionData} from '../abi/abi.support'
import {AugmentBlockBase, BalanceBase, InstructionBase, TokenBalanceBase, TransactionBase} from './types'


export class Block {
    header: object
    transactions: Transaction[]
    instructions: Instruction[]
    balances: Balance[]
    tokenBalances: TokenBalance[]

    constructor(src: AugmentBlockBase) {
        this.header = src.header
        this.transactions = map(src.transactions, s => new Transaction(this.header, s))
        this.instructions = map(src.instructions, s => new Instruction(this.header, s))
        this.balances = map(src.balances, s => new Balance(this.header, s))
        this.tokenBalances = map(src.tokenBalances, s => new TokenBalance(this.header, s))
    }
}


export class Transaction {
    transactionIndex!: number
    #block: object
    #instructions?: object[]
    #balances?: object[]
    #tokenBalances?: object[]

    constructor(block: object, src: TransactionBase) {
        this.#block = block
        Object.assign(this, src)
    }

    get block(): object {
        return this.#block
    }

    set block(value: object) {
        this.#block = value
    }

    get instructions(): object[] {
        if (this.#instructions == null) {
            this.#instructions = []
        }
        return this.#instructions
    }

    set instructions(value: object[]) {
        this.#instructions = value
    }

    get balances(): object[] {
        if (this.#balances == null) {
            this.#balances = []
        }
        return this.#balances
    }

    set balances(value: object[]) {
        this.#balances = value
    }

    get tokenBalances(): object[] {
        if (this.#tokenBalances == null) {
            this.#tokenBalances = []
        }
        return this.#tokenBalances
    }

    set tokenBalances(value: object[]) {
        this.#tokenBalances = value
    }
}


export class Instruction {
    transactionIndex!: number
    instructionAddress!: number[]
    data?: Base58Bytes
    #block: object
    #transaction?: Transaction
    #inner?: Instruction[]
    #parent?: Instruction
    #data?: string
    #d1?: string
    #d2?: string
    #d4?: string
    #d8?: string
    #d16?: string

    constructor(block: object, src: InstructionBase) {
        this.#block = block
        Object.assign(this, src)
    }

    get block(): object {
        return this.#block
    }

    set block(value: object) {
        this.#block = value
    }

    get transaction(): Transaction | undefined {
        return this.#transaction
    }

    set transaction(value: Transaction | undefined) {
        this.#transaction = value
    }

    getTransaction(): Transaction {
        if (this.#transaction == null) {
            throw new Error(`Transaction is not set`)
        } else {
            return this.#transaction
        }
    }

    get inner(): Instruction[] {
        if (this.#inner == null) {
            this.#inner = []
        }
        return this.#inner
    }

    set inner(instructions: Instruction[]) {
        this.#inner = instructions
    }

    get parent(): Instruction | undefined {
        return this.#parent
    }

    set parent(value: Instruction | undefined) {
        this.#parent = value
    }

    get d1(): Bytes {
        if (this.#d1) {
            return this.#d1
        } else {
            return this.#d1 = this.getHexData().slice(0, 4)
        }
    }

    get d2(): Bytes {
        if (this.#d2) {
            return this.#d2
        } else {
            return this.#d2 = this.getHexData().slice(0, 6)
        }
    }

    get d4(): Bytes {
        if (this.#d4) {
            return this.#d4
        } else {
            return this.#d4 = this.getHexData().slice(0, 10)
        }
    }

    get d8(): Bytes {
        if (this.#d8) {
            return this.#d8
        } else {
            return this.#d8 = this.getHexData().slice(0, 18)
        }
    }

    get d16(): Bytes {
        if (this.#d16) {
            return this.#d16
        } else {
            return this.#d16 = this.getHexData().slice(0, 34)
        }
    }

    getHexData(): Bytes {
        if (this.#data) return this.#data
        if (this.data == null) {
            throw new Error(`.data field is not available`)
        }
        let bytes = getInstructionData(this as any)
        return this.#data = toHex(bytes)
    }
}


export class Balance {
    transactionIndex!: number
    #block: object
    #transaction?: Transaction

    constructor(block: object, src: BalanceBase) {
        this.#block = block
        Object.assign(this, src)
    }

    get block(): object {
        return this.#block
    }

    set block(value: object) {
        this.#block = value
    }

    get transaction(): Transaction | undefined {
        return this.#transaction
    }

    set transaction(value: Transaction | undefined) {
        this.#transaction = value
    }

    getTransaction(): Transaction {
        if (this.#transaction == null) {
            throw new Error(`Transaction is not set on balance change record`)
        } else {
            return this.#transaction
        }
    }
}


export class TokenBalance {
    transactionIndex!: number
    #block: object
    #transaction?: Transaction

    constructor(block: object, src: TokenBalanceBase) {
        this.#block = block
        Object.assign(this, src)
    }

    get block(): object {
        return this.#block
    }

    set block(value: object) {
        this.#block = value
    }

    get transaction(): Transaction | undefined {
        return this.#transaction
    }

    set transaction(value: Transaction | undefined) {
        this.#transaction = value
    }

    getTransaction(): Transaction {
        if (this.#transaction == null) {
            throw new Error(`Transaction is not set on balance change record`)
        } else {
            return this.#transaction
        }
    }
}


// Faster version of `array.map()`
function map<T, R>(items: T[] | undefined, f: (it: T) => R): R[] {
    if (items == null) return []
    let result: R[] = new Array(items.length)
    for (let i = 0; i < items.length; i++) {
        result[i] = f(items[i])
    }
    return result
}


function toHex(data: Uint8Array): string {
    if (Buffer.isBuffer(data)) {
        return '0x' + data.toString('hex')
    } else {
        return '0x' + Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('hex')
    }
}
