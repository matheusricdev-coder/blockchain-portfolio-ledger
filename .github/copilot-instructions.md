# Copilot Instructions — Blockchain Portfolio Ledger

## Architectural Constraints

1. Domain layer must never import infrastructure.
2. Controllers must not contain business logic.
3. Ledger entries are immutable.
4. Use dependency injection for repositories.
5. Avoid circular dependencies.

---

## Coding Standards

- Strict TypeScript mode
- No `any`
- Explicit return types
- Small functions (< 40 lines preferred)
- Pure functions in domain layer

---

## Error Handling

- Never swallow errors
- Use typed domain errors
- Log errors with context

---

## Idempotency

All event processing must:
- Check for existing event before insert
- Be safe to retry

---

## Testing

Every use case must have:
- At least one unit test
- Edge case coverage
- Deterministic behavior

---

## Forbidden

- Business logic inside controllers
- Direct DB calls inside domain
- Updating ledger entries
- Mutating domain entities