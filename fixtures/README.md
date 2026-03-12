# Fixture Pack

This migrated repo keeps a trimmed fixture pack only.

Included:

- `fixtures/demo_batch_20`
  Main evaluator-ready 20-item batch demo with files included.
- `fixtures/single_review_demo`
  Clean application-and-label pair for the single-review golden path.

Not included here:

- large public-label corpora
- public registry manifests

Those were intentionally left out so this new root stays lightweight and easy to rebuild.

## Recommended Use

- Use `demo_batch_20` as the main evaluator/demo dataset.
- Use `single_review_demo` for the fastest single-review walkthrough.

## Notes

- `demo_batch_20` is the best single artifact to keep if you want one demo-ready pack.
