# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. (Adopted from Karpathy Skills)

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations; don't pick silently.
- Push back on overcomplication.
- Stop and ask if something is unclear.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No unrequested features or abstractions.
- No single-use abstractions.
- Keep output concise (e.g., 50 lines vs 200).

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Match existing style. Don't reformat unrelated code.
- Don't "improve" adjacent code unless requested.
- Remove only the dead code your changes created.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- State a plan: [Step] → verify: [check].
- Reproduce bugs with tests before fixing.
- Ensure all tests pass before and after changes.
