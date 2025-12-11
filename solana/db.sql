
CREATE DATABASE whirlpool_src;


CREATE TABLE whirlpool_src.blocks (
    number UInt64,
    hash String,
    parent_number UInt64,
    parent_hash String,
    timestamp DateTime
)
ENGINE = MergeTree()
ORDER BY number;


CREATE TABLE whirlpool_src.swaps (
    block_number UInt64,
    block_hash String,
    block_timestamp DateTime,
    transaction_index UInt32,
    transaction_hash String,
    from_token String,
    from_owner String,
    from_amount UInt64,
    to_token String,
    to_owner String,
    to_amount UInt64
)
ENGINE = MergeTree()
ORDER BY (block_number, transaction_index);
