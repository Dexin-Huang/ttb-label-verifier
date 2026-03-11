# MVP Review Flow

This note captures the simplest correct product model for the take-home.

## Product Shape

The prototype should feel like three flows:

- `Single Review`
- `Batch Review`
- `Session Dashboard`

That is the whole product surface.

## Core Mental Model

The system is a transformation:

- `application data in`
- `label file in`
- `review result out`

The application is the declared reference input for the run.

The label is the visual evidence we inspect.

Gemini reads the label.

The rule engine compares the extracted label values to the application values.

## Where The Application Comes From

For this prototype the application comes from:

- the single-review form
- the batch manifest CSV

Typical fields:

- `beverage_type`
- `brand_name`
- `class_type`
- `alcohol_content`
- `net_contents`
- `bottler_name_address`
- `country_of_origin`
- `requires_government_warning`

## What Gemini Does

Gemini is the extraction layer only.

Its job:

- read the uploaded image or PDF
- return structured candidate values for the fields we care about

It should not decide whether the label passes.

The extraction contract is defined by:

- `src/lib/gemini.ts`
- `src/lib/types.ts`

## What Our Code Does

The deterministic rule engine compares:

- `application value`
against
- `extracted label value`

Implemented rule areas:

- brand name
- class/type
- alcohol content
- net contents
- bottler/address
- country of origin
- government warning presence
- government warning text
- government warning heading format

That logic lives in:

- `src/lib/rules/engine.ts`

## Triage Semantics

The tool does not make the final regulatory decision.

It triages the work into:

- `pass_candidate`
- `needs_review`
- `likely_fail`

Meaning:

- `pass_candidate`: the implemented rules found no issue
- `needs_review`: the result is ambiguous or low-confidence
- `likely_fail`: the system found a strong discrepancy that should be reviewed first

## Single Review Flow

User flow:

1. enter application fields
2. upload one label image or PDF
3. click `Review`
4. inspect the result

Server flow:

1. validate the application payload
2. validate the uploaded file
3. call Gemini for extraction
4. run deterministic comparison rules
5. return review JSON

Active endpoint:

- `src/app/api/review/route.ts`

Core executor:

- `src/lib/run-stateless-review.ts`

## Batch Review Flow

Batch review is the same unit of work repeated many times.

Current input shape:

- `manifest.csv`
- the referenced label files

Each row provides:

- application fields
- `label_filename`

Current execution model:

1. parse the manifest
2. validate the referenced files
3. create a session batch record
4. call the same review request per item
5. run requests with bounded concurrency
6. append each completed item into session history

Current default concurrency:

- `5`

## Session Dashboard

The dashboard is current-session history.

Behavior:

- single reviews append one review
- batch reviews append many reviews
- results are ordered by completion time
- users can remove one item or clear the whole session

Storage split:

- `sessionStorage` for review and batch metadata
- `IndexedDB` for uploaded label blobs used by detail previews

## Dataset Strategy In This Migrated Root

This repo keeps only the small, practical fixture pack:

- `fixtures/demo_batch_20`
- `fixtures/sample_batch`
- `fixtures/labels/synthetic`
- `fixtures/reviewed_subset`
- `fixtures/extraction-responses`

The larger historical corpora were intentionally left behind in the old repos so this working root stays lightweight.
