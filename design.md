# Design — DeskClaw

A locked design system for the complete desktop application. DeskClaw is a code
workbench powered by OpenClaw, not a dashboard wrapped around an editor.

## Genre

Modern-minimal professional developer tool. Dense, quiet, precise.

## Macrostructure family

- App: Workbench — activity rail, contextual surface, editor group, AI sidecar,
  bottom panel, persistent status bar.
- Setup: Guided workbench — one task per step with a persistent setup outline.
- Content: Tool surface — title, compact controls, searchable data region.

## Theme

- `--color-paper`: oklch(18% 0.012 255)
- `--color-paper-2`: oklch(21% 0.014 255)
- `--color-paper-3`: oklch(25% 0.015 255)
- `--color-ink`: oklch(92% 0.008 255)
- `--color-ink-2`: oklch(69% 0.012 255)
- `--color-rule`: oklch(31% 0.014 255)
- `--color-accent`: oklch(63% 0.18 255)
- `--color-focus`: oklch(72% 0.15 245)

## Typography

- Interface: Segoe UI Variable, Segoe UI, weight 400–600
- Mono: Cascadia Code, Cascadia Mono, weight 400–600
- Type scale: 11 / 12 / 13 / 14 / 16 / 20 / 28 px
- Headings are roman, compact, and sentence case.

## Spacing

Four-point scale. Controls default to 28–32 px high. Workbench panels consume
space; they do not float inside decorative cards.

## Motion

- Fast state transitions: 120 ms
- Panel transitions: 180 ms
- No entrance choreography.
- Reduced-motion removes transforms and transitions.

## Microinteractions stance

- Silent success with status-bar confirmation.
- Immediate keyboard focus.
- Tooltips identify icon-only controls.
- Destructive operations require explicit confirmation.

## CTA voice

- Primary: compact cobalt fill, 4 px radius, verb-first label.
- Secondary: transparent or graphite fill with a one-pixel rule.

## Per-page allowances

- App surfaces do not use marketing enrichment, gradients, glass, or ornamental
  illustration.
- Empty editor states may use the DeskClaw mark at low contrast.
- Setup can use a wider reading column but must retain workbench chrome.

## What every surface MUST share

- Semantic color tokens.
- Interface and mono stacks.
- Four-point spacing.
- Square-to-soft 4/6 px radii.
- The same focus ring, button voice, field treatment, and status semantics.

