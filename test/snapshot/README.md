# Snapshot tests

Snapshot testing runs the compiler on many of the test projects in test/fixtures/execute and verifies that the compiled output is identical to a pre-calculated "snapshot". This verifies:

 - The compiler is deterministic (mostly)
 - The compiler's output does not change unexpectedly
 - Optimizations and type analysis in the generated code are working properly

These snapshots are automatically verified as part of the integration tests. There is also a more readable CLI for humans. To verify the snapshots:

```
node test/snapshot
```

When the compiler's output or the test projects have intentionally changed, run:

```
node test/snapshot --update
```

Verify that the snapshot diff is what you expect, then commit the changes.
