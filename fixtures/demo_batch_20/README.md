# Demo Batch 20

This folder is the main evaluator-ready batch example for the prototype.

It is intentionally triage-shaped:

- `8` cleaner cases intended to land as `pass_candidate`
- `6` image-noise cases intended to land as `needs_review`
- `6` stronger discrepancy cases intended to land as `likely_fail`

The point is not to auto-reject labels.

The point is to help a reviewer focus on the flagged slice of the batch instead of rereading every clean item.

## Contents

- `manifest.csv`
- `expected_results.csv`
- `manifest.json`
- `files/`

## How To Use It

Current app flow:

- upload `manifest.csv`
- upload all label files from `files/`

Longer-term packaging can collapse this into one `batch.zip`, but the current app does not require that.
