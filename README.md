# TTB Label Verifier

AI-assisted alcohol label triage prototype for the TTB take-home.

## What It Is

The product is intentionally narrow:

- `Single Review`
- `Batch Review`
- `Dashboard`

The tool does not make the final regulatory decision.

It extracts label text with Gemini, compares it to application data with deterministic rules, and surfaces:

- `Pass`
- `Needs Review`
- `Likely Fail`

The point is to let a reviewer focus on the flagged slice of the work instead of rereading every clean item.

## Current Architecture

This repo uses a stateless review core:

- client sends `application JSON + label file`
- server runs Gemini extraction
- flagged fields can get one conservative Gemini re-check when the first pass looks ambiguous
- deterministic rules compare extracted values to the application
- server returns review JSON directly

Single review uses:

- `POST /api/review`

Batch review uses the same endpoint repeatedly with bounded client-side concurrency.
Each batch item is just a repeated single-review run against one manifest row and one label file.

Session history is client-side only:

- review metadata and results live in `sessionStorage`
- batch metadata lives in `sessionStorage`
- uploaded label blobs for preview live in `IndexedDB`

There is no database and no Supabase dependency in the active runtime path.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Gemini API key

### Setup

```bash
cd C:\Users\dexin\Projects\treasury
npm install
```

The working copy already includes `.env.local`. If you need to recreate it, start from `.env.example` and set:

```bash
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

## Sample Data

The repo keeps two demo-ready fixture packs under `fixtures/`:

- `fixtures/demo_batch_20`
  Main 20-item demo batch with expected triage outcomes and bundled label files.
- `fixtures/single_review_demo`
  Clean single-review pair for the golden-path demo.

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Project Structure

```txt
src/
  app/
    page.tsx                       dashboard
    reviews/new/page.tsx           single review flow
    reviews/[id]/page.tsx          session-backed review detail
    batches/new/page.tsx           batch review flow
    batches/[id]/page.tsx          session-backed batch detail
    api/review/route.ts            stateless review endpoint
  components/
    app/                           dashboard, review, batch, and detail views
  lib/
    gemini.ts                      Gemini extraction
    run-stateless-review.ts        core review execution
    application-upload.ts          single-review file parsing
    batch-upload.ts                batch manifest parsing + filename matching
    review-session.ts              session review persistence
    review-batches.ts              session batch persistence
    review-session-files.ts        IndexedDB file storage
    review-export.ts               client-side CSV export
    rules/                         deterministic rule engine
fixtures/
  demo_batch_20/                  main evaluator-ready batch demo
  single_review_demo/             golden single-review pair
```

## Verification

Current checks run clean in this migrated root:

- `npm run lint`
- `npm run build`

## Design Notes

- Gemini is the extraction layer only.
- Deterministic rules produce the final triage result.
- A second Gemini pass only re-checks flagged fields when the first extraction looks ambiguous.
- Session history is intentional for the prototype; there is no permanent archive.
- Batch review is repeated single-review execution with bounded parallelism.
- The current batch flow runs with concurrency `6` by default.
