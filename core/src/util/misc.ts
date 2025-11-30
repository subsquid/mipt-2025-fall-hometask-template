import assert from "node:assert"


export function last<T>(array: T[]): T {
    assert(array.length > 0)
    return array[array.length - 1]
}


export function maybeLast<T>(array: T[]): T | undefined {
    return array.length > 0 ? array[array.length - 1] : undefined
}


export function runProgram(main: () => Promise<void>, log?: (err: Error) => void): void {

    function onerror(err: unknown) {
        if (log) {
            log(ensureError(err))
        } else {
            console.error(err)
        }
        process.exit(1)
    }

    try {
        main().then(() => process.exit(0), onerror)
    } catch(e: unknown) {
        onerror(e)
    }
}


export class NonErrorThrow extends Error {
    constructor(public readonly value: unknown) {
        super('Non-error object was thrown')
    }
}


export function ensureError(val: unknown): Error {
    if (val instanceof Error) {
        return val
    } else {
        return new NonErrorThrow(val)
    }
}


export function bisect<I, K>(items: I[], key: K, compare: (item: I, key: K) => number): number {
    let beg = 0
    let end = items.length
    while (beg < end) {
        let dist = end - beg
        let pos = beg + (dist - (dist % 2)) / 2
        let it = items[pos]
        let order = compare(it, key)
        if (order == 0) return pos
        if (order > 0) {
            end = pos
        } else {
            beg = pos + 1
        }
    }
    return beg
}


export function groupBy<T, G>(elements: Iterable<T>, group: (e: T) => G): Map<G, T[]> {
    let grouping = new Map<G, T[]>()
    for (let element of elements) {
        let key = group(element)
        let g = grouping.get(key)
        if (g == null) {
            grouping.set(key, [element])
        } else {
            g.push(element)
        }
    }
    return grouping
}
