<p align="center">
  <img src="./public/ttb-label-verifier-mark.svg" width="84" alt="TTB Label Verifier mark" />
</p>

# TTB Label Verifier

AI-assisted alcohol label triage prototype for the TTB take-home.

**Live:** [ttb-label-verifier-dun.vercel.app](https://ttb-label-verifier-dun.vercel.app/)

## TL;DR

To run the product and test the two main flows, use these exact files:

- `Single Review`
  Upload [application-form-good-times-rye.json](./fixtures/single_review_demo/application-form-good-times-rye.json) and [label-image-good-times-rye.png](./fixtures/single_review_demo/label-image-good-times-rye.png).
- `Batch Review`
  Upload [manifest.csv](./fixtures/demo_batch_20/manifest.csv) and every file in [fixtures/demo_batch_20/files](./fixtures/demo_batch_20/files).

Why these fixtures:

- the single-review pair is the clean golden path and should come back as `Pass`
- the batch pack is triage-shaped: `8` clean cases, `6` noisy but reviewable cases, `6` stronger discrepancy cases
- the batch files were built from reviewed baseline labels plus controlled degradations (blur, glare, crop, occlusion, missing back-label content)

The demo surfaces flagged items quickly instead of making a reviewer reread every clean one.

## Setup

### Requirements

- Node.js 20.9+
- npm
- Gemini API key

### Local Run

```bash
git clone https://github.com/Dexin-Huang/ttb-label-verifier.git
cd ttb-label-verifier
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
npm run test
npm run build
```

The automated test layer is intentionally narrow: one API smoke path, one batch manifest and matching check, and one warning-rule check. The fixture packs in `fixtures/` still do most of the product verification work because they exercise the real end-to-end flows.

## Tech Stack

- Next.js / React / TypeScript
- Tailwind CSS
- Gemini 3.1 Flash Lite (label extraction and adjudication)
- IndexedDB + sessionStorage (client persistence)
- Vitest (targeted smoke and rule checks)
- Vercel (deployment)

## Product Scope

The prototype centers on three primary workflows:

- `Dashboard`
- `Single Review`
- `Batch Review`

It does not make the final regulatory decision. It helps a reviewer get to the likely problems faster.

The output language is simple on purpose:

- `Pass`
- `Needs Review`
- `Likely Fail`

This maps to the assignment's actual workflow: compare application data to label artwork, flag mismatches, let the reviewer spend time on the items that matter.

## Why I Designed It This Way

### 1. AI for perception, rules for accountability

I did not want the final compliance result to be "whatever the model felt." The assignment asks for routine comparison and regulatory nuance, so the split is:

- Gemini reads the label
- deterministic rules compare extracted data to application data
- the UI explains mismatches field by field

This keeps the system auditable for hard checks like alcohol content, net contents, government warning presence, wording, and heading format. The final outcome stays stable instead of becoming a black-box judgment call.

### 2. Blind extraction first, targeted re-check second

The first extraction pass is blind. I do not send application values into pass one because that creates confirmation bias. I want the model to read what is actually on the label, not what it expects to see.

The second pass only runs on flagged fields, and only for the ambiguous slice. It asks:

- did the first extraction miss the text?
- did it grab too much surrounding copy?
- does the field actually appear on the image?

If the second pass corrects the extraction, the deterministic rules run again. This beats both naive extremes (pure OCR plus rules, or full AI pass-fail).

### 3. Batch is the same pipeline as single review

Batch review is not a separate engine. It is repeated single-review execution with bounded parallelism: one review path, one rule engine, one API route, one output model. This kept the prototype easier to reason about and made it easier to improve extraction quality across both flows at once.

### 4. Structured application input was the right tradeoff

The prototype expects structured application data (`.json` for single review, `.csv` for batch). I made that tradeoff on purpose. In one week, the harder and more useful problem was reading labels reliably and explaining mismatches. OCR-ing both sides of the comparison would have added complexity and failure modes without improving the core triage loop. If this were expanded, scanned application forms could be added as a separate ingestion layer.

### 5. Session-scoped persistence was deliberate

I chose `sessionStorage` plus `IndexedDB` because the assignment says not to integrate with COLA and not to overbuild infrastructure. The real question for one week was:

"Can this product make an agent faster?"

Not:

"Can this product ship a full compliance platform with auth, audit retention, and durable storage?"

So the persistence layer covers review history, batch detail pages, and uploaded image preview recovery within the current browser session.

### 6. The interface is designed for triage, not dashboards

The assignment was unusually explicit about usability, especially for less technical reviewers. That drove these choices:

- a very small top-level IA
- upload states that say exactly what is missing and what is ready
- spreadsheet-style review history instead of analytics cards
- issue-first detail views that foreground flagged fields
- warm, restrained surfaces with stronger contrast where people need to scan quickly
- serif display typography for calm hierarchy, paired with sans-serif body copy for legibility

I kept the workflow close to how a reviewer already thinks: application, label, checklist, issues.

## Key Tradeoffs

### Gemini was the right prototype choice, even with the firewall concern

The assignment notes that government firewalls can block outbound ML services, which is a real production concern. I still chose Gemini because it was the fastest way to validate the product with good image understanding and low overhead.

The model choice is isolated behind [src/lib/gemini.ts](./src/lib/gemini.ts), so the rest of the app does not care what model handles extraction and adjudication. Today: Gemini to prove value quickly. Later: swap the backend without rewriting the UI or rules.

### No direct COLA integration

On purpose, and aligned with the brief. The prototype is a standalone proof of concept, not an integration exercise.

### Why I did not let the model make the final call

An all-LLM pipeline would look simpler on paper, but it would be weaker where accountability matters most: exact warning text, all-caps heading checks, numeric fields like ABV and proof, repeatability when the same file is run twice, and explainability when a reviewer asks why something was flagged.

AI handles extraction and targeted re-checks. Rules handle the final comparison. That is the right tradeoff between capability and trust for this workflow.

## Production Path / Next Steps

If this were moving beyond the take-home, I would take it in this order:

### 1. Keep Gemini for short-term validation

Deploy the tool, run it on real reviewer traffic, and collect evidence about where it helps and where it fails: first-pass extraction output, second-pass adjudication overrides, field-level outcomes, and human reviewer corrections.

### 2. Build a labeled corpus from reviewer interaction

The fastest way to de-risk a future model transition is to keep examples of extraction misses, ambiguous brand/class/bottler reads, warning statement edge cases, and image quality failures.

### 3. Evaluate a self-hosted model path

If firewall rules, cost, or procurement constraints make external APIs impractical, the next step is to evaluate a self-hosted open VLM behind the same interface in [src/lib/gemini.ts](./src/lib/gemini.ts).

A reasonable medium-term path is to start with Gemini for product validation, collect adjudication and reviewer data, benchmark a self-hosted Qwen-VL family model or similar open VLM, fine-tune on the collected dataset, and host it inside the target environment. This works better than guessing at a self-hosted model too early because it is grounded in actual failure cases.

### 4. Move from session storage to durable workflow state

Next infrastructure layer: durable review history, user authentication, audit logs, reviewer feedback capture, batch job records beyond the browser session. I did not build that here because it is a different project from proving the core review loop.

### 5. Add a reviewer feedback loop

The product will improve fastest if reviewers can mark: correct flag, false flag, missed issue. Those three actions feed back into model evaluation and rule tuning.

## Code Map

Start here to understand the implementation:

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

The central design decision here is simple: use AI where perception is hard, use rules where accountability matters. This made the prototype faster to build, easier to explain, and closer to how it would actually need to work inside a regulated workflow.
