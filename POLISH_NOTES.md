# Polish Notes

Current working priorities for making the product cleaner and more beautiful.

## Immediate Priorities

### 1. Remove hesitation from upload flows

- make `Replace` explicit after upload
- keep accepted file formats visible
- keep completed states strong and obvious

### 2. Make help more visual

- use anchored popovers, not heavy modals
- add tiny example structures instead of only prose
- show exactly what kind of file the user should upload

### 3. Make batch preflight feel trustworthy

- keep counts obvious
- expose exact missing and extra filenames
- prevent review from starting until the batch is clean

### 4. Keep typography and spacing calm

- preserve the museum/editorial tone
- avoid inflated spacing
- keep headers small, elegant, and readable

### 5. Preserve architectural simplicity

- Gemini for extraction only
- deterministic rules for matching
- batch as repeated single review

## Anti-Goals

- do not add noisy dashboard widgets
- do not add decorative UI that weakens clarity
- do not turn the tool into a demo-only experience
- do not add a second AI decision layer for matching
