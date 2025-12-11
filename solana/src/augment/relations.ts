import {Block, Instruction, Transaction} from './objects'


export function setUpRelations(block: Block): void {
    let txs: (Transaction | undefined)[] = new Array(
        block.transactions.length && (block.instructions.length || block.tokenBalances.length || block.balances.length)
            ? block.transactions[block.transactions.length - 1].transactionIndex + 1
            : 0
    )

    if (txs.length > 0) {
        for (let tx of block.transactions) {
            txs[tx.transactionIndex] = tx
        }
    }

    if (block.instructions.length > 0) {
        let stack: Instruction[] = []
        for (let ins of block.instructions) {
            ins.transaction = txs[ins.transactionIndex]
            ins.transaction?.instructions.push(ins)
            let prev = stack.length ? stack[stack.length - 1] : undefined
            if (prev?.transactionIndex === ins.transactionIndex) {
                while (prev && !isInner(prev.instructionAddress, ins.instructionAddress)) {
                    stack.pop()
                    prev = stack.length ? stack[stack.length - 1] : undefined
                }
                ins.parent = prev
                prev?.inner.push(ins)
                stack.push(ins)
            } else {
                stack.length = 0
                stack[0] = ins
            }
        }
    }

    for (let b of block.balances) {
        b.transaction = txs[b.transactionIndex]
        b.transaction?.balances.push(b)
    }

    for (let b of block.tokenBalances) {
        b.transaction = txs[b.transactionIndex]
        b.transaction?.tokenBalances.push(b)
    }
}


function isInner(parent: number[], inner: number[]): boolean {
    if (parent.length > inner.length) return false
    for (let i = 0; i < parent.length; i++) {
        if (parent[i] != inner[i]) return false
    }
    return true
}
