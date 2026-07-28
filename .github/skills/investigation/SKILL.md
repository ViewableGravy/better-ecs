---
name: investigation
description: Investigate bugs, regressions, visual glitches, startup issues, teleporting, jitter, broken interactions, or any user-reported problem before attempting a fix. USE WHEN the user asks to investigate, debug, reproduce, verify a regression, or confirm the real cause of an issue.
---

# Investigation

## Purpose

Provide a strict workflow for debugging reported problems so fixes are based on objective reproduction instead of guesses.

## When to use

- A user reports incorrect behavior and wants the cause identified before or alongside a fix.
- A bug might be visual, timing-sensitive, data-dependent, or hard to reproduce.
- A regression or testable failure should be locked down before implementation.

## Workflow

1. Replicate the issue objectively before changing code.
   - Prefer one of these:
     - a failing automated test,
     - a browser-based reproduction with observable evidence,
     - a direct code-path reproduction that proves the incorrect state.
   - Do not guess that a hypothesis is the bug or that a patch is correct.
2. If the issue is not replicable, stop and gather more information with the AskQuestions tool.
   - Explain what was attempted.
   - Explain what remains ambiguous.
   - Prefer a freeform input prompt so the user can describe the missing scenario in their own words.
3. If the issue is a regression, or can reasonably be tested, add or update a test that reproduces it in code.
   - Verify that the test fails before implementing the fix.
   - Use the failing test to prove incorrectness and to prevent the regression from returning.
4. Implement the fix with the smallest code change that resolves the verified cause.
   - Avoid unrelated cleanup.
   - If the fix requires an architectural change, confirm with the user whether to include it now or split it into a separate task so commits can stay isolated.
5. Verify the fix objectively.
   - Re-run the reproduction.
   - Re-run the regression test.
   - Run relevant tests, lint, and typecheck for the touched area or project.
   - Ask the user to verify the behavior if visual confirmation is still important.
6. If the issue is still unresolved, use the AskQuestions response as the source of truth for the next step.
   - State exactly what is still confusing, hard to reproduce, or blocked.
   - Offer concrete options for how to continue.
   - Prefer a freeform user response over yes/no prompts when additional scenario detail is needed.

## Expectations

- Reproduction first, fix second.
- Evidence over intuition.
- Minimal change over speculative rewrite.
- If verification cannot be completed, say exactly what could not be verified and why.