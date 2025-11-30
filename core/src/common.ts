import {last} from './util/misc'


export interface BlockRef {
    number: number
    hash: string
}


export interface BlockHeader extends BlockRef {
    parentHash: string
    parentNumber?: number
}


export interface BlockBase {
    header: BlockHeader
}


export class ForkException extends Error {
    constructor(
        fromBlock: number,
        parentBlockHash: string,
        public previousBlocks: BlockRef[]
    ) {
        let base = last(previousBlocks)
        super(
            `expected block ${fromBlock} to have parent hash ${parentBlockHash}, ` +
            `but got ${base.number}#${base.hash} as a parent instead`
        )
    }

    get name(): string {
        return 'ForkException'
    }

    get isSubsquidForkException(): true {
        return true
    }
}


export function isForkException(err: unknown): err is ForkException {
    return err instanceof Error && (err as ForkException).isSubsquidForkException === true
}
