# Design Document: TTB Label Verifier

## Overview

This prototype is intentionally narrow. It helps a reviewer compare structured application data against alcohol label artwork, then triages the result into:

- `pass_candidate`
- `needs_review`
- `likely_fail`

The core design rule is simple:

- Gemini reads the label
- deterministic code decides what matched

The product is not a records system and it is not an autonomous approver.

## Product Surface

The app has three user-facing flows:

- `Single Review`
- `Batch Review`
- `Session Dashboard`

That is enough for the take-home. Everything else is secondary.

## Architecture

```txt
[ Browser ]
    |
    v
[ Next.js App ]
    |
    +-- /api/review
          |
          +-- validate application + file
          +-- Gemini extraction
          +-- deterministic rule engine
          +-- review JSON response
```

There is no active database in the runtime path.

Session state is client-side only:

- review and batch metadata live in `sessionStorage`
- uploaded label blobs used for preview live in `IndexedDB`

## Single Review Flow

Single review is the core unit of work.

Request:

- `application` JSON
- one `file` (`PNG`, `JPG`, `JPEG`, or `PDF`)

Endpoint:

- `POST /api/review`

Server flow:

1. validate the application payload
2. validate the uploaded file
3. send the label to Gemini for structured extraction
4. compare extracted fields to the application with deterministic rules
5. return review JSON directly

Response includes:

- overall triage status
- field-by-field results
- extracted values
- summary counts
- latency

The client then writes that review into session history so it can appear on the dashboard and detail pages.

## Batch Review Flow

Batch review is just repeated single review with bounded concurrency.

Current UX:

- upload `manifest.csv`
- upload the referenced label files

Each CSV row contains application data plus `label_filename`.

Client flow:

1. parse and validate the manifest
2. match each row to an uploaded file
3. create a session batch record
4. run `POST /api/review` per item with bounded concurrency
5. append completed review results into the same session history used by single review
6. expose progress and CSV export

Default concurrency is `5`.

That keeps the system simple while still demonstrating realistic batch triage.

## Session Dashboard

The dashboard is current-session history, not a permanent archive.

It shows:

- recent single reviews
- batch results as they complete
- status filters
- quick access to review detail
- clear-session and remove-item actions

Clicking a review opens a detail view that shows:

- application data
- label preview
- field result table
- what passed and what was flagged

## Rule Engine

The rule engine is the decision layer.

Implemented rule categories:

- brand name
- class/type
- alcohol content
- net contents
- bottler/address
- country of origin
- government warning presence
- government warning text
- government warning heading format

Design intent:

- obvious agreement should become `pass_candidate`
- ambiguous reads should become `needs_review`
- strong discrepancies should become `likely_fail`

This keeps final judgment with the human reviewer while still reducing routine work.

## Why No Database

For this prototype, the database added complexity without improving the core review loop.

We do not need permanent persistence to prove the key value:

- upload input
- extract label text
- compare fields
- surface flagged work

A database would make more sense later for:

- audit history
- shared team queues
- durable async jobs
- user accounts

None of that is required to demonstrate the product in one week.

## Dataset Strategy

The repo ships a mixed sample-data pack:

- real public TTB label sources for realism
- reviewed clean pairs for demos
- synthetic and mutated cases for controlled mismatches
- a 20-item demo batch with a realistic distribution of clean and flagged items

This is the right tradeoff for the take-home:

- real labels make the demo credible
- controlled variants make evaluation predictable

## Main Tradeoffs

### Gemini for extraction

Chosen because it lets the prototype move quickly and keeps the extraction layer isolated.

Tradeoff:

- fast to prototype
- not the long-term government-safe deployment story

The architecture keeps this isolated so a local extractor can replace it later without rewriting the rule engine.

### Session-only history

Chosen because it keeps the product aligned with the take-home workflow.

Tradeoff:

- simple and fast
- no permanent archive

That is acceptable for the prototype because the value is triage, not record management.

### Client-driven batch processing

Chosen because it reuses the single-review contract and avoids queue infrastructure.

Tradeoff:

- simple
- not durable across browser/session loss

For the take-home this is acceptable, because the main point is to show the triage loop and result UX.

## Future Evolution

If this prototype were extended, the likely next steps would be:

- swap Gemini for a local extraction service
- accept a single `batch.zip` upload instead of separate CSV plus files
- add durable batch execution
- add a permanent review store only if audit history becomes a requirement

The important constraint is that those changes should preserve the current boundary:

- extraction is replaceable
- deterministic rules remain the decision layer
