# Fixture Pack

This migrated repo keeps a trimmed fixture pack only.

Included:

- `fixtures/demo_batch_20`
  Main evaluator-ready 20-item batch demo with files included.
- `fixtures/sample_batch`
  Small manifest example that points at the synthetic labels.
- `fixtures/labels/synthetic`
  Small controlled synthetic labels for simple manual checks.
- `fixtures/reviewed_subset`
  Small reviewed metadata subset kept for provenance and demo context.
- `fixtures/extraction-responses`
  Sample extraction payloads used by unit tests and mock runs.

Not included here:

- large public-label corpora
- clean-pair build artifacts
- public registry manifests
- fixture-building scripts that depended on those larger datasets

Those were intentionally left out so this new root stays lightweight and easy to rebuild.

## Recommended Use

- Use `demo_batch_20` as the main evaluator/demo dataset.
- Use `sample_batch` for a tiny quick-start batch run.
- Use `labels/synthetic` for manual spot checks or small demos.
- Use `reviewed_subset` as metadata context for the hand-checked source examples.

## Notes

- `demo_batch_20` is the best single artifact to keep if you want one demo-ready pack.
- `sample_batch` depends on files inside `fixtures/labels/synthetic`.
