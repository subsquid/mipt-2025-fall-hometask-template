# MIPT Blockchain Data Course Home Assignment

This repository serves as the starter template for the MIPT Blockchain Data course (Fall 2025) home assignment.

It is a multi-package pnpm workspace with the following structure:

* [core](./core) – ETL framework
* [evm](./evm) – example project that tracks ERC-20 transfers
* [solana](./solana) – example project that tracks Orca Exchange swaps on Solana
* [solution](./solution) – placeholder for the student’s solution
* [tasks](./tasks) – list of available assignments

## Prerequisites

* Node.js v22 or higher
* [pnpm v10](https://pnpm.io)
* Recent `docker(1)`
* MacOS or Linux

## Getting started

```bash
# Install dependencies
pnpm i

# Build the project
pnpm -r build

# Run one of the examples
cd evm
make up && sleep 2 && make db
node lib/main.js
```

## Known caveats

* Data processing may sometimes hang indefinitely if there are Subsquid Portal connection issues
