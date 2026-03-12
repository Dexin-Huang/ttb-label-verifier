<p align="center">
  <img src="./public/ttb-label-verifier-mark.svg" width="84" alt="TTB Label Verifier mark" />
</p>

# TTB Label Verifier

AI-assisted alcohol label triage prototype for the TTB take-home.

## TL;DR

If you only want to run the product and test the two main flows, use these exact files:

- `Single Review`
  Upload [application-form-good-times-rye.json](./fixtures/single_review_demo/application-form-good-times-rye.json) and [label-image-good-times-rye.png](./fixtures/single_review_demo/label-image-good-times-rye.png).
- `Batch Review`
  Upload [manifest.csv](./fixtures/demo_batch_20/manifest.csv) and every file in [fixtures/demo_batch_20/files](./fixtures/demo_batch_20/files).

Those fixture packs were chosen deliberately:

- the single-review pair is the clean golden path and should come back as `Pass`
- the batch pack is triage-shaped: `8` clean cases, `6` noisy but reviewable cases, and `6` stronger discrepancy cases
- the batch files were built from reviewed baseline labels plus controlled degradations and omissions such as blur, glare, crop, occlusion, and missing back-label content

That makes the demo realistic enough to show the actual value of the product: surface the flagged slice quickly instead of making a reviewer reread every clean item.

## Setup

### Requirements

- Node.js 18+
- npm
- Gemini API key

### Local Run

```bash
cd C:\Users\dexin\Projects\treasury
npm install
npm run dev
```

Create `.env.local` with:

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

Optional:

```bash
NEXT_PUBLIC_BATCH_CONCURRENCY=6
```

For Vercel, use [vercel.env.example](./vercel.env.example) directly.

### Verification

```bash
npm run lint
npm run build
```

## Product Scope

The prototype is intentionally narrow:

- `Dashboard`
- `Single Review`
- `Batch Review`

It does not make the final regulatory decision. It helps a reviewer get to the likely problems faster.

The output language is intentionally simple:

- `Pass`
- `Needs Review`
- `Likely Fail`

That maps to the assignment's actual workflow: compare the submitted application data to the label artwork, flag mismatches, and let the human reviewer spend time on the items that matter.

## Why I Designed It This Way

### 1. AI for perception, rules for accountability

I did not want the final compliance result to be "whatever the model felt." The assignment asks for both routine comparison and regulatory nuance, so the split here is:

- Gemini reads the label
- deterministic rules compare extracted label data to application data
- the UI explains the mismatches field by field

That keeps the system explainable for hard checks like:

- alcohol content
- net contents
- government warning presence
- government warning wording
- government warning heading format

It also keeps the final outcome stable and auditable instead of turning the entire product into a black-box judgment call.

### 2. Blind extraction first, targeted re-check second

The first extraction pass is intentionally blind. I do not send application values into pass one, because that creates confirmation bias. I want the model to read what is actually on the label, not what it expects to see.

The second pass only runs on flagged fields, and only for the ambiguous slice. That pass is a conservative adjudication step:

- did the first extraction miss the text?
- did it grab too much surrounding copy?
- does the field actually appear on the image?

If the second pass corrects the extraction, the deterministic rules run again. That makes the system much stronger than either naive extreme:

- pure OCR plus rules only
- full AI pass-fail judgment

### 3. Batch is the same pipeline as single review

Batch review is not a separate engine. It is repeated single-review execution with bounded parallelism.

That matters for consistency:

- one review path
- one rule engine
- one API route
- one output model

This kept the prototype easier to reason about and made it much easier to improve extraction quality across both flows at once.

### 4. Structured application input was the right tradeoff

The current prototype expects structured application data:

- single review: `.json`
- batch review: `.csv`

I made that tradeoff on purpose. In one week, the harder and more valuable problem was reading labels reliably and explaining mismatches. OCR-ing both sides of the comparison would have added complexity, latency, and failure modes without improving the core triage loop as much.

If this were expanded, scanned application forms could be added as a separate ingestion layer.

### 5. Session-scoped persistence was deliberate

I chose `sessionStorage` plus `IndexedDB` for this prototype because the assignment explicitly says not to integrate with COLA and not to overbuild infrastructure. The real question for one week was:

"Can this product make an agent faster?"

Not:

"Can this product ship a full compliance platform with auth, audit retention, and durable storage?"

So the persistence layer is just enough to support:

- review history
- batch detail pages
- uploaded image preview recovery within the current browser session

### 6. The interface is designed for triage, not dashboards

The assignment was unusually explicit about usability, especially for less technical reviewers. That drove several design decisions:

- a very small top-level IA
- upload states that say exactly what is missing and what is ready
- spreadsheet-style review history instead of analytics cards
- issue-first detail views that foreground flagged fields
- warm, restrained surfaces with stronger contrast where people need to scan quickly
- serif display typography for calm hierarchy, paired with simpler sans-serif body copy for legibility

I intentionally kept the workflow close to how a reviewer already thinks: application, label, checklist, issues.

## Key Tradeoffs

### Gemini was the right prototype choice, even with the firewall concern

The assignment notes that government firewalls can block outbound ML services. That is a real production concern. I still chose Gemini for the prototype because it was the fastest way to validate the product with strong image understanding and low infrastructure overhead.

That choice is isolated behind [src/lib/gemini.ts](./src/lib/gemini.ts), so the rest of the app does not care which model is behind the extraction and adjudication steps.

In other words:

- today: use Gemini to prove product value quickly
- later: swap the model backend without rewriting the UI or rules

### No direct COLA integration

That is intentional and aligned with the brief. The prototype is a standalone proof of concept, not an integration exercise.

### Why I did not let the model make the final call

An all-LLM pipeline would look simpler on paper, but it would be weaker where this workflow most needs accountability:

- exact warning text
- all-caps and bold heading checks
- numeric fields like ABV, proof, and net contents
- repeatability when the same file is run twice
- explainability when a reviewer asks why something was flagged

Using AI for extraction and targeted re-checks, then rules for the final comparison, is the cleanest compromise between capability and trust.

## Production Path / Next Steps

If this were moving beyond the take-home, I would take it in this order:

### 1. Keep Gemini for short-term validation

Right now the most useful thing is to deploy the tool, run it on real reviewer traffic, and collect structured evidence about where it helps and where it fails.

Specifically:

- first-pass extraction output
- second-pass adjudication overrides
- final field-level outcomes
- eventual human reviewer corrections

That gives us the right dataset for the next phase.

### 2. Build a labeled corpus from reviewer interaction

The fastest way to de-risk a future model transition is to keep examples of:

- extraction misses
- ambiguous brand, class, and bottler reads
- warning statement edge cases
- image quality failures

That corpus is more valuable than speculative model swapping.

### 3. Evaluate a self-hosted model path

If firewall rules, cost, or procurement constraints make external APIs impractical, the next step would be to evaluate a self-hosted open VLM behind the same interface in [src/lib/gemini.ts](./src/lib/gemini.ts).

A reasonable medium-term direction would be:

- start with Gemini 3.1 Flash Lite for product validation
- collect adjudication and reviewer data
- benchmark a self-hosted Qwen-VL family model or similar open vision-language model
- fine-tune or adapt it on the collected label-review dataset
- host it inside the target environment

That path is much stronger than guessing at a self-hosted model too early, because it is grounded in the actual failure cases from this workflow.

### 4. Move from session storage to durable workflow state

The next infrastructure layer would be:

- durable review history
- user authentication
- audit logs
- reviewer feedback capture
- batch job records beyond the browser session

I did not build that here because it is a different project from proving the core review loop.

### 5. Add a stronger reviewer feedback loop

The product will get better fastest if reviewers can mark:

- correct flag
- false flag
- missed issue

Those three actions would improve both model evaluation and future rule tuning.

## Code Map

If you want to understand the implementation quickly, start here:

- [src/lib/run-stateless-review.ts](./src/lib/run-stateless-review.ts)
  shared review pipeline for single and batch
- [src/lib/gemini.ts](./src/lib/gemini.ts)
  first-pass extraction and second-pass adjudication
- [src/lib/rules](./src/lib/rules)
  deterministic comparison engine
- [src/components/app/review-page.tsx](./src/components/app/review-page.tsx)
  single-review intake and result flow
- [src/components/app/batch-page.tsx](./src/components/app/batch-page.tsx)
  batch intake, preflight, and execution
- [src/components/app/dashboard-page.tsx](./src/components/app/dashboard-page.tsx)
  review history and issue-first triage surface

## Repository Layout

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
    gemini.ts                      Gemini extraction + adjudication
    run-stateless-review.ts        shared review execution
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

## Closing Note

The central design decision in this repo is simple:

Use AI where perception is hard. Use rules where accountability matters.

That made the prototype faster to build, easier to explain, and closer to how I think this would actually need to evolve inside a regulated workflow.
