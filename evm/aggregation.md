Our ETL process so far was good for putting elementary input events into the ClickHouse database.

However, more often than not, we want to analyze not individual events but the state they lead to —  
that is, their aggregations.

So, how shall we aggregate?

One option is to extend our data ingestion process to perform aggregations as well, 
but that’s going to be hard and clumsy.

For the sake of concreteness, let’s discuss the case where putting all the resulting data into ClickHouse
is a hard requirement, and the running state is too large to be held in memory.

In such a case, aggregation on the ingester side would imply:

1. We need an additional database that supports point lookups to store the running state.
2. Our aggregation procedure should handle the case when processing is rolled back to some previous point in time due to a chain fork or pipeline restart.
3. We need to duplicate the entire aggregation input if we want the ability to restart processing from an arbitrary point, or download the entire state from ClickHouse at startup.

Implementing all the above “by hand” and in an ad-hoc manner is odd in light of the fact
that databases are already supposed to be good at this.

Let’s try to use ClickHouse to derive the required state.

We’ll study the computation of the total ERC-20 balance of any account at an arbitrary block,
deriving it from the `erc20_src.balance_updates` table.  
We’ll also create an extended version of the table augmented with the `balance` field — the total balance of an account after the update.

## Compute on the fly

First, we should try to recompute everything on the fly, as it is the simplest and most powerful approach.

```sql
CREATE VIEW balances_on_the_fly AS
SELECT contract,
       account,
       SUM(amount) AS amount
FROM erc20_src.balance_updates
WHERE block_number <= {at: UInt64}
GROUP BY contract, account;
```

```sql
-- Compute the balance of high-traffic Coinbase account
SELECT * FROM balances_on_the_fly(at = 23000000) 
WHERE account = '0x382ffce2287252f930e1c8dc9328dac5bf282ba1';
```

The above query is actually quite snappy and, in my setting, completes well under `0.5 secs`
while aggregating around `360k` rows.

Now, let’s try to augment balance updates with the total balance.
This case might be important for soft-realtime analytics and dashboards.

```sql
CREATE VIEW balance_updates_on_the_fly AS
SELECT t.block_number,
       t.transaction_hash,
       t.log_index,
       t.contract,
       t.account,
       t.amount,
       SUM(t.amount) OVER (PARTITION BY t.contract, t.account ORDER BY t.block_number, t.log_index)
           + b.amount AS balance
FROM erc20_src.balance_updates AS t
LEFT OUTER JOIN balances_on_the_fly(at = {after: UInt64}) AS b
             ON t.contract = b.contract AND t.account = b.account
WHERE t.block_number > {after:UInt64}
  AND t.block_number < {below: UInt64};

-- although the {below} parameter could be moved out of the view, we'll leave it there, 
-- because otherwise the ClickHouse planner has trouble producing a sane plan
```

Test:

```sql
-- augmented balance updates for blocks between 23....1 and 23....9.
SELECT * FROM balance_updates_on_the_fly(after = 23000000, below = 23000010);
```

The above query took over 2 minutes to complete.

Let’s figure out how many rows we have to process in the above query
as a sanity check confirming that the reason for the long execution time is
indeed the amount of data and not a bad execution plan.

```sql
SELECT count(*) FROM erc20_src.balance_updates
WHERE account IN (SELECT account
                  FROM erc20_src.balance_updates
                  WHERE block_number BETWEEN 23000001 AND 23000009)
  AND block_number <= 23000000;
```

We get `66300k` rows, so the execution times of the “balance” and “balance updates” queries
are roughly proportional to the amount of data they process.

So the compute-on-the-fly approach does not quite work for us.
Let’s try another one.

## Maintain pre-aggregated data

### 1

We’ll split the entire range of blocks into epochs of `50 000` blocks each.
We’ll name each epoch after its first block.

```sql
CREATE FUNCTION epoch AS (block_number) -> intDiv(block_number, 50000) * 50000;
CREATE FUNCTION next_epoch AS (epoch) -> epoch + 50000;
```

### 2

We’ll maintain aggregated balance updates for each full epoch.

```sql
CREATE TABLE balance_updates_agg (
    epoch UInt64,
    contract FixedString(42),
    account FixedString(42),
    amount Int128
)
ENGINE = SummingMergeTree()
ORDER BY (contract, account, epoch);
```

```sql
INSERT INTO balance_updates_agg
SELECT
    epoch(block_number) AS epoch,
    contract,
    account,
    SUM(amount) AS amount
FROM
    erc20_src.balance_updates
WHERE
    block_number >= (SELECT max(next_epoch(epoch)) FROM balance_updates_agg) AND
    block_number < (SELECT epoch(max(number)) FROM erc20_src.blocks)
GROUP BY epoch(block_number), contract, account;
```

The insert query above is careful to insert only full epochs
and not to insert the same records twice.

It could be run periodically via a [refreshable materialized view](https://clickhouse.com/docs/materialized-view/refreshable-materialized-view).
This option, however, lacks the consistency guarantees we need.

Instead, we can perform this insert via an external process that runs the SELECT query
and inserts its results atomically.

### 3

Now we should be able to compute balances much faster at any given block.

```sql
CREATE VIEW balances AS
SELECT contract,
       account,
       sum(amount) AS amount
FROM (
      -- use pre-aggregated data for all full epochs below the given block
      SELECT contract,
             account,
             amount
      FROM balance_updates_agg
      WHERE epoch < epoch({at:UInt64})
      UNION ALL
      -- use source balance_updates records for the last mile
      SELECT contract,
             account,
             amount
      FROM erc20_src.balance_updates
      WHERE block_number >= (SELECT max(next_epoch(epoch)) FROM balance_updates_agg WHERE epoch < epoch({at:UInt64}))
        AND block_number <= {at :UInt64}
)
GROUP BY contract, account;
```

```sql
SELECT * 
FROM balances(at = 22999999) -- pick a block that represents the largest amount of data to aggregate
WHERE account = '0x382ffce2287252f930e1c8dc9328dac5bf282ba1';
```

The above query completes in ~100 ms.

Such low times, however, are hard to compare outside a principled benchmark.
Let’s measure the complexity of the query in terms of the number of rows aggregated instead.

```sql
SELECT count(*)
FROM (
     SELECT 1
     FROM balance_updates_agg
     WHERE epoch < 22950000
       AND account = '0x382ffce2287252f930e1c8dc9328dac5bf282ba1'
     UNION ALL
     SELECT 1
     FROM erc20_src.balance_updates
     WHERE account = '0x382ffce2287252f930e1c8dc9328dac5bf282ba1'
       AND block_number BETWEEN 22950000 AND 22999999
);
```

It is `5800` rows.

Now, to augmented balance updates.

```sql
CREATE VIEW balance_updates AS
SELECT t.block_number,
       t.transaction_hash,
       t.log_index,
       t.contract,
       t.account,
       t.amount,
       SUM(t.amount) OVER (PARTITION BY t.contract, t.account ORDER BY t.block_number, t.log_index) + b.amount AS balance
FROM
    erc20_src.balance_updates AS t
LEFT OUTER JOIN balances(at = {after:UInt64}) AS b ON t.contract = b.contract AND t.account = b.account
WHERE t.block_number > {after:UInt64}
  AND t.block_number < {below: UInt64};
```

```sql
SELECT * FROM balance_updates(after = 22999990, below = 23000000);
```

This is not as long as the “on-the-fly” query, but still suspiciously long.

Let’s measure the number of rows involved.

```sql
CREATE VIEW balance_rows AS
WITH accounts AS (SELECT distinct account
                  FROM erc20_src.balance_updates
                  WHERE block_number > {after:UInt64} AND block_number < {below:UInt64}),

     epoch_rows AS (SELECT *
                    FROM balance_updates_agg
                    WHERE epoch < epoch({after:UInt64})
                      AND account IN accounts),

     last_mile_rows AS (SELECT *
                        FROM erc20_src.balance_updates
                        WHERE block_number BETWEEN epoch({after:UInt64}) AND {after:UInt64}
                          AND account IN accounts)
SELECT
    (SELECT count(*) FROM epoch_rows) AS "pre-aggregated",
    (SELECT count(*) FROM last_mile_rows) AS "last mile";
```

```sql
SELECT * FROM balance_rows(after = 22999990, below = 23000000);
```

| pre-aggregated | last mile |
|----------------|-----------|
| 10463          | 1527478   |

The amount of data is definitely not enough to explain such a long execution time.
Note that the rows we need should generally lie close together in both the pre-aggregated and last-mile parts.

Let’s shape the view a bit differently.

```sql
CREATE VIEW balance_updates_2 AS
WITH updates AS (SELECT *
                 FROM erc20_src.balance_updates
                 WHERE block_number > {after:UInt64}
                   AND block_number < {below:UInt64}),

     pre AS (SELECT a.contract, a.account, a.amount
             FROM balance_updates_agg AS a,
                  updates AS u
             WHERE epoch < epoch({after:UInt64})
               AND a.contract = u.contract
               AND a.amount = u.amount),

     last_mile AS (SELECT a.contract, a.account, a.amount
                   FROM erc20_src.balance_updates AS a,
                        updates AS u
                   WHERE a.block_number BETWEEN epoch({after:UInt64}) AND {after:UInt64}
                     AND a.contract = u.contract
                     AND a.amount = u.amount),

     balances AS (SELECT contract, account, sum(amount) AS balance
                  FROM (
                           SELECT *
                           FROM pre
                           UNION ALL
                           SELECT *
                           FROM last_mile
                           )
                  GROUP BY contract, account)
SELECT u.block_number,
       u.transaction_hash,
       u.log_index,
       u.contract,
       u.account,
       u.amount,
       SUM(u.amount) OVER (PARTITION BY u.contract, u.account ORDER BY u.block_number, u.log_index) +
       b.balance AS balance
FROM updates AS u
         LEFT OUTER JOIN balances AS b
                         ON u.contract = b.contract AND u.account = b.account;
```

```sql
SELECT * FROM balance_updates(after = 22999990, below = 23000000);
```

Now it completes in 3–5 seconds, but the time does not get lower when the last mile becomes completely absent,
indicating that the plan ClickHouse uses is still largely suboptimal.

```sql
SELECT * FROM balance_updates(after = 23000000, below = 23000010); -- takes the same time
SELECT * FROM balance_rows(after = 23000000, below = 23000010); -- 12511, 38
```

The underlying issue is that ClickHouse is not capable of using join tables
(and also dynamic `IN` conditions) to narrow down the read range.
As a result, it scans the `balance_updates_agg` table in its entirety on each query.
That, of course, does not scale.

Note, however, that although our pre-aggregation strategy didn’t work well for this case,
it *would* work if we had lower `(contract, account)` cardinality,
allowing us to keep the data ingestion part simple and making the whole system more flexible and easier to manage.
