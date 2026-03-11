# Prototype Decisions

This file captures the main scope and tradeoff decisions for the one-week take-home.

## Product Scope

The prototype UI is intentionally limited to three flows:

- `Single Review`
- `Batch Review`
- `Session Dashboard`

Non-goal:

- a permanent review archive or records-management system

## Core Review Model

The product is a transformation pipeline:

- `application data in`
- `label file in`
- `review result out`

Gemini is the extraction layer only.

Deterministic code is the decision layer.

## Triage Positioning

The tool is a triage assistant, not an auto-approver.

It should:

- surface mismatches
- surface ambiguous cases
- let clean candidates move faster
- leave the final decision with the human reviewer

## Statefulness

Single review is logically stateless.

Batch review and the dashboard only need temporary session state.

Implementation choice:

- review and batch metadata live in browser session history
- uploaded label blobs used for preview live in IndexedDB
- no permanent backend persistence is required for the prototype

## Batch Contract

Current implementation:

- upload `manifest.csv`
- upload the referenced label files

Execution model:

- batch is repeated single-review execution
- Gemini calls run with bounded parallelism
- default concurrency is `5`
- completed items are appended into the same session dashboard history

## Data Strategy

For the new canonical root we kept only the small working fixture pack:

- `fixtures/demo_batch_20`
- `fixtures/sample_batch`
- `fixtures/labels/synthetic`
- `fixtures/reviewed_subset`
- `fixtures/extraction-responses`

This is enough to demo the product, exercise the rules, and keep the repo lightweight.

## Reviewed Subset

The highest-confidence retained metadata subset is:

- `fixtures/reviewed_subset`

This is kept for provenance and context behind the demo batch, even though the larger historical corpus was not migrated into this new root.

## Known Positioning

The dataset in this root should be described honestly:

- demo-ready batch assets
- a small synthetic set
- a small reviewed metadata subset
- no claim that these are original internal TTB application exports
