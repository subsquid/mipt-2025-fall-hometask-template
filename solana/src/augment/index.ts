import {Block} from './objects'
import {setUpRelations} from './relations'
import type {AugmentBlock, AugmentBlockBase} from './types'


export type {AugmentBlock}


/**
 * Augment portal block items with additional helper methods and references to related objects.
 */
export function augmentBlock<B extends AugmentBlockBase>(portalBlock: B): AugmentBlock<B> {
    let block = new Block(portalBlock)
    setUpRelations(block)
    return block as any
}
