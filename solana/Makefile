up:
	@docker compose up -d


down:
	@docker compose down -v


db:
	@cat db.sql | docker run -i \
		--network="$(notdir $(shell pwd))_default" \
		--entrypoint clickhouse-client \
		clickhouse:lts-jammy \
		--host clickhouse \
		--password 123


abi:
	@npx squid-solana-typegen ./src/abi whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc#whirlpool


.PHONY: up down db abi
