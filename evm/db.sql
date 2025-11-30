
CREATE DATABASE erc20_src;


CREATE TABLE erc20_src.blocks (
    number UInt64,
    hash FixedString(66),
    parent_hash FixedString(66),
    timestamp DateTime
)
ENGINE = MergeTree()
ORDER BY number;


CREATE TABLE erc20_src.balance_updates
(
    block_number UInt64,
    block_hash FixedString(66),
    block_timestamp DateTime,
    log_index UInt32,
    transaction_hash FixedString(66),
    contract FixedString(42),
    account FixedString(42),
    counterparty FixedString(42),
    amount Int128
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(block_timestamp)
ORDER BY (account, block_number, log_index);
