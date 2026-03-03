# Blockchain Portfolio Ledger

## Overview

A deterministic off-chain ledger system that indexes ERC-20 events, builds an immutable internal ledger, generates historical snapshots, and reconciles balances against on-chain state.

---

## Problem

Blockchain data is:
- Public
- Immutable
- Not organized by user
- Expensive to compute repeatedly

This system builds a structured and auditable representation of on-chain events.

---

## Features (MVP)

- ERC-20 Transfer indexing
- Immutable ledger entries
- Snapshot generation
- Balance reconciliation
- REST API

---

## Tech Stack

- Node.js
- TypeScript (strict)
- Fastify
- PostgreSQL
- Redis
- BullMQ
- Zod

---

## Running Locally

```bash
docker-compose up