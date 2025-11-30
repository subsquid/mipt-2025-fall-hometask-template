import {Validator} from '@subsquid/util-internal-validation'
import type {BlockBase} from '../../../common'
import type {PortalApi} from '../portal-api'
import type {AnyQuery, GetQueryBlock} from '../query'
import {getEvmBlockSchema, patchEvmQueryFields} from '../query/evm/schema'
import {getSolanaBlockSchema} from '../query/solana/schema'
import {createQueryStream as createStream, DataBatch, StreamOptions} from './internal'


export type {StreamOptions, DataBatch}


export function createQueryStream<Q extends AnyQuery>(
    api: PortalApi,
    query: Q,
    options?: StreamOptions
): AsyncIterable<DataBatch<GetQueryBlock<Q>>>

export function createQueryStream(
    api: PortalApi,
    query: AnyQuery,
    options?: StreamOptions
): AsyncIterable<DataBatch>
{
    let schema: Validator<BlockBase>
    switch(query.type) {
        case 'evm':
            schema = getEvmBlockSchema(query.fields ?? {})
            query = {...query}
            query.fields = patchEvmQueryFields(query.fields ?? {})
            break
        case 'solana':
            schema = getSolanaBlockSchema(query.fields)
            break
        default:
            throw new Error(`unsupported query type - ${(query as any).type}`)
    }
    return createStream(
        api,
        query,
        schema,
        options
    )
}
