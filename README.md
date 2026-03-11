# TTB Label Verifier

AI-assisted alcohol label triage prototype for the TTB take-home.

## What It Is

The product is intentionally narrow:

- `Single Review`
- `Batch Review`
- `Session Dashboard`

The tool does not make the final regulatory decision.

It extracts label text with Gemini, compares it to application data with deterministic rules, and surfaces:

- `pass_candidate`
- `needs_review`
- `likely_fail`

The point is to let a reviewer focus on the flagged slice of the work instead of rereading every clean item.

## Current Architecture

This repo uses a stateless review core:

- client sends `application JSON + label file`
- server runs Gemini extraction
- deterministic rules compare extracted values to the application
- server returns review JSON directly

Single review uses:

- `POST /api/review`

Batch review uses the same endpoint repeatedly with bounded client-side concurrency.

Session history is client-side only:

- review metadata and results live in `sessionStorage`
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

This migrated repo keeps the small evaluator-ready fixture pack under `fixtures/`:

- `fixtures/demo_batch_20`
  Main 20-item demo batch with expected triage outcomes and bundled label files.
- `fixtures/sample_batch`
  Tiny manifest example that points at the synthetic label set.
- `fixtures/reviewed_subset`
  Small reviewed metadata subset kept for provenance/context.
- `fixtures/labels/synthetic`
  Small controlled synthetic label set for simple manual runs.
- `fixtures/extraction-responses`
  Mock extraction payloads used by tests.

The larger historical corpora were intentionally left behind in the old repos so this new root stays small and rebuild-friendly.

## Gemini Image CLI

For quick reference-driven image generation and editing:

```bash
npm run gemini:image -- \
  --prompt "Create a fictional distilled spirits label inspired by the attached references. Change all brands, logos, artwork, and addresses." \
  --image ..\reference_material\ttb_official_examples\distilled_spirits_example_1.jpg \
  --image ..\reference_material\ttb_official_examples\distilled_spirits_example_2.jpg \
  --out-dir tmp\gemini-run \
  --aspect-ratio 3:4
```

Defaults:

- model: `gemini-3.1-flash-image-preview`

## Useful Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:run
npm run gemini:image
```

## Project Structure

```txt
src/
  app/
    page.tsx                  session dashboard
    reviews/new/page.tsx      single review flow
    reviews/[id]/page.tsx     session-backed review detail
    batches/new/page.tsx      batch upload
    batches/[id]/page.tsx     session-backed batch detail
    api/review/route.ts       stateless review endpoint
  components/
    layout/                   providers + session store
    review/                   review wizard, preview, result views
    batch/                    batch upload/progress/table
    dashboard/                session history list + filters
  lib/
    gemini.ts                 Gemini extraction
    run-stateless-review.ts   core review execution
    review-session-files.ts   IndexedDB file storage
    review-export.ts          client-side CSV export
    csv.ts                    batch manifest parsing
    rules/                    deterministic rule engine
fixtures/
  demo_batch_20/             main evaluator-ready batch demo
  sample_batch/              small manifest example
  labels/synthetic/          small synthetic labels pack
tests/
  rules/                     unit tests for the deterministic engine
```

## Verification

Current checks run clean in this migrated root:

- `npm run lint`
- `npm run test:run`
- `npm run build`

## Design Notes

- Gemini is the extraction layer only.
- Deterministic rules produce the triage result.
- Session history is intentional for the prototype; there is no permanent archive.
- Batch review is repeated single-review execution with bounded parallelism.
- Start with concurrency `5` for Gemini calls and adjust only if rate limits force it.
