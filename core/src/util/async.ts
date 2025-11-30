
export interface Future<T> {
    resolve: (val: T) => void
    reject: (err: Error) => void
    promise: () => Promise<T>
}


export function createFuture<T>(): Future<T> {
    let future: Future<T> | undefined
    let promise = new Promise<T>((resolve, reject) => {
        future = {
            resolve,
            reject,
            promise: () => promise
        }
    })
    return future!
}


export function wait(ms: number, abortSignal?: AbortSignal): Promise<void> {
    if (abortSignal) {
        return new Promise((resolve, reject) => {
            if (abortSignal.aborted) return reject(new Error('aborted'))

            abortSignal.addEventListener('abort', abort, {once: true})

            let timer = setTimeout(() => {
                abortSignal.removeEventListener('abort', abort)
                resolve()
            }, ms)

            function abort() {
                clearTimeout(timer)
                reject(new Error('aborted'))
            }
        })
    } else {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
    }
}
