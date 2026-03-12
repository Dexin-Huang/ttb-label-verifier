# TTB Label Verifier Evaluation

Internal product scorecard for the take-home requirements and ongoing design iteration.

Deployment is intentionally not scored here. Publishing to Vercel is treated as a release task, not a product-quality risk.

## Rubric

This rubric maps the assignment requirements to product execution quality.

| Category | Weight | What it measures |
| --- | ---: | --- |
| Core workflow correctness and completeness | 30 | Single review, batch review, checklist coverage, result accuracy |
| UX clarity and error handling | 20 | Obvious actions, clean flows, safe failure states, low-confusion behavior |
| Technical choices | 15 | Sound architecture, scoped use of AI, deterministic compliance checks |
| Code quality and organization | 15 | Modularity, maintainability, clean boundaries, verification coverage |
| Attention to assignment requirements | 10 | Latency sensitivity, warning strictness, batch need, older-user usability |
| Visual design and polish | 10 | Clean, elegant, readable, consistent, museum-like execution |

## Current Grade

| Category | Score | Notes |
| --- | ---: | --- |
| Core workflow correctness and completeness | 28 / 30 | Single review is real. Batch review is now real and reuses the same review path. Warning statement checks are appropriately strict. Main deduction: single review still depends on structured application input instead of a more native operator-side entry flow. |
| UX clarity and error handling | 17 / 20 | Upload states are cleaner, accepted formats are visible, help is contextual, and batch has a real preflight summary. Main deduction: single review still asks the user to understand `.json` / `.csv` application input, and batch filename matching is still a concept some users must learn. |
| Technical choices | 15 / 15 | Gemini is used only for extraction. Matching stays deterministic. Batch is repeated single review with bounded concurrency. This is the right architecture for the scope. |
| Code quality and organization | 14 / 15 | Review, batch, session storage, parsing, export, and rules are separated cleanly. The codebase passes lint, tests, and build. Minor deduction: some session/runtime prototype wiring is still spread across multiple utilities. |
| Attention to assignment requirements | 9 / 10 | The implementation clearly responds to the assignment's concerns: speed, older users, warning exactness, and batch imports. Minor deduction: the single-review intake is still more technical than the “grandma test” ideal. |
| Visual design and polish | 8 / 10 | The product is calm, restrained, and increasingly coherent. Typography, spacing, and surface treatment are moving in the right direction. Main deduction: some flows can still get simpler and more obvious before they feel effortless. |

**Total: 91 / 100**

**Grade: A-**

## What Is Strong

- Single review is real and Gemini-backed.
- Batch review is real and uses the same exact pipeline as single review.
- The checklist/result model is aligned with the business problem.
- Government warning validation is strict in the right places.
- Session-backed history makes the prototype easy to demo without adding backend persistence complexity.
- The visual direction is restrained and increasingly consistent.

## Main Remaining Gaps

### 1. Single-review intake is still somewhat technical

The user-facing label says `Application Form`, but the actual accepted prototype input is a structured `.json` or `.csv` application record.

That is acceptable for the prototype, but it is still the largest mismatch between:

- what a less technical reviewer expects
- what the current product actually needs

### 2. Batch review still relies on filename discipline

The preflight summary helps a lot, but the user still needs to understand that:

- each row needs a `label_filename`
- each uploaded label file must match that filename

That is operationally fine, but still a learning burden.

### 3. Some flows could still be more obvious at a glance

The current UI is cleaner, but the next level of polish is not more features. It is removing hesitation:

- clearer replace behavior after upload
- more explicit “what happens next”
- less reliance on reading small helper copy

## Grandma Test

This is the current standard:

> Could a cautious, non-technical reviewer understand what to upload, what the system is checking, and whether the review is ready, without hunting around?

### Current status

**Partially passes.**

Why it passes:

- primary actions are clear
- accepted formats are visible
- completed states are stronger
- batch preflight prevents confusing mismatched runs
- result screens are easy to scan

Why it does not fully pass yet:

- `Application Form` still hides a structured file requirement
- batch filename matching is still a learned rule
- some understanding still depends on helper copy rather than immediate visual clarity

## Highest-Value Next Improvements

These are the next changes most likely to improve product quality without changing the underlying architecture.

### 1. Make replace behavior explicit

After upload, each intake card should expose a small `Replace` action so the user does not have to infer that clicking the whole card again replaces the file.

### 2. Make the help popovers more visual

The current help content is useful, but it is still prose-heavy.

Best next step:

- add a tiny example schema/table for `Application Form`
- add a tiny example row for `CSV Manifest`
- optionally show one small visual label example for `Label Image`

### 3. Make batch preflight more actionable

The summary counts are good. The next step is to make them actionable:

- `Missing files: 2` should expand to the exact missing filenames
- `Extra files: 1` should show the unexpected filename

That reduces trial-and-error.

### 4. Reduce conceptual mismatch around “Application Form”

If the product keeps the current prototype input shape, the UI should get slightly more honest about it.

Options:

- keep `Application Form`, but make the help popover explicitly say this is the structured exported record used for prototype review
- or rename it to `Application Record`

### 5. Keep pushing on density and legibility

The product is visually close to the intended tone, but the next polish pass should be about:

- sharper hierarchy
- slightly less reading load on upload surfaces
- stronger at-a-glance confidence that the user is doing the right thing

## Architecture Decision: Matching Should Stay Deterministic

This decision is correct and should remain stable unless a very specific edge case proves otherwise.

### Keep this split

- AI extracts what is on the label
- deterministic rules compare extracted values to the application
- humans review ambiguous results

### Why this is right

- more explainable
- more stable for exact compliance checks
- better for ABV, net contents, warning text, and warning heading format
- lower latency
- lower cost
- easier to debug

### Do not add a second AI pass for matching by default

If AI is ever added later, it should only be a narrow fallback for ambiguous interpretation, not the final authority for compliance matching.

## Verification Status

Current working state passes:

- `npm run lint`
- `npm run test:run`
- `npm run build`

## Working Goal

The target is not “feature complete.”

The target is:

- clean
- legible
- obvious
- elegant
- trustworthy

The remaining work should mostly improve clarity and polish, not change the core review architecture.
