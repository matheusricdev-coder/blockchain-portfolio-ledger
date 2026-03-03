# Architecture Overview — Blockchain Portfolio Ledger

## 1. Architectural Style

- Clean Architecture
- Event-driven processing
- Deterministic state reconstruction
- Immutable ledger model

---

## 2. High-Level Components

Blockchain RPC
    ↓
Indexer Job
    ↓
Raw Events Table
    ↓
Normalizer Use Case
    ↓
Ledger Entries Table
    ↓
Snapshot Job
    ↓
Snapshots Table
    ↓
API Layer

---

## 3. Layers

### Domain
Business rules:
- LedgerEntry
- Snapshot
- Reconciliation
- Balance calculation

No external dependencies.

---

### Application
Use cases:
- IndexBlocks
- NormalizeEvents
- GenerateSnapshot
- ReconcileWallet

Orchestrates domain logic.

---

### Infrastructure
Implements:
- PostgreSQL repositories
- RPC client
- Redis queue
- Logger

---

### API
- Fastify routes
- DTO validation (Zod)
- No business rules

---

## 4. Determinism Rule

The system must be able to:
- Rebuild ledger from raw_events
- Recalculate snapshots
- Produce identical results

---

## 5. Idempotency Rule

Event identity:
chainId:blockNumber:txHash:logIndex

Must be unique.

---

## 6. Reprocessing Strategy

Reprocessing:
- Does NOT delete raw_events
- Rebuilds derived state only
- Is safe to run multiple times