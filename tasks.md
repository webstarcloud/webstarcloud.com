# tasks.md — AAA Brand Integration (Site + CV + Repos)

## Brand lock and vocabulary discipline

- [x] Define the four pillars as final, canonical labels used everywhere
  - [x] Pillar labels: R&D, Systems, Primitives, Judgement
  - [x] Add a one-sentence definition for each pillar (for internal use)
- [x] Create a “phrase rotation list” to avoid repeating “irreversible decisions”
  - [x] Rotate in: invariants, containment, recovery paths, blast radius, auditability, drift
- [x] Align site copy to the pillars (no section without a pillar mapping)

## Fix social previews and metadata (high-impact external polish)

- [x] Replace SVG OG image with PNG for compatibility
  - [x] Export `src/assets/og.png` at 1200×630
  - [x] Keep `src/assets/og.svg` as editable source (optional)
  - [x] Update `src/index.html`:
    - [x] `og:image` → `/assets/og.png`
    - [x] `twitter:image` → `/assets/og.png`
    - [x] Add `og:image:alt` and `twitter:image:alt`
- [x] Tighten default `<title>` and description strings
  - [x] Update `src/index.html`:
    - [x] Title: “David Webster — R&D Systems Architect”
    - [x] Meta description: thesis + constraints in one sentence

## Make the homepage feel “real” without adding noise

- [x] Replace placeholder “Selected System Work” entries with real work from the CV
  - [x] Update `src/app/home/home.component.html`
    - [x] Entry: TMNL privacy-preserving analytics (sanitised)
    - [x] Entry: Standard Bank real-time event platform recovery (sanitised)
    - [x] Entry: GPU digital twin platform redesign (sanitised)
  - [x] Ensure each entry uses: Constraint → Primitive → Outcome → What changed
- [x] Replace placeholder “Current R&D Signals” with real repo-backed artefacts
  - [x] Update `src/app/home/home.component.html`
    - [x] Worktree Swarm (agent-swarmkit)
    - [x] News Radar (news-radar)
    - [x] Semblance (semblance)
- [x] Calibrate the credibility strip to one line (muted)
  - [x] Update `src/app/home/home.component.html`
  - [x] Decide whether to include Kubestronaut (only if accurate + linkable)

## Rebuild /selected-work into three flagship case studies

- [x] Define a single case-study component format (even if hardcoded v1)
  - [x] Fields: System, Constraint, Primitive, Outcome, What changed, “Sanitised notes”
- [x] Implement three flagship entries
  - [x] Update `src/app/selected-work/selected-work.component.html`
    - [x] TMNL: access-bounded streams + invariants
    - [x] Standard Bank: schema contracts + drift prevention
    - [x] Backbase: control plane + governance boundaries for agentic systems
- [x] Add an “Archive” link or collapsible section for older engagements
  - [x] Keep it short: list only names + one constraint line each

## Make /rd map directly to actual repositories

- [x] Replace fictional artefacts with real ones (or rename to match reality)
  - [x] Update `src/app/rd/rd.component.html`
  - [x] For each artefact include:
    - [x] Question
    - [x] Primitive
    - [x] Evidence (repo link)
    - [x] Status
- [x] Decide what “Holodeck” means on the site
  - [x] Option A: Holodeck = diagram/architecture rehearsal tool (repo: holodeck)
  - [x] Option B: Holodeck = migration rehearsal harness (create repo or rename site artefact)

## Make /writing a curated “diagram-first” library

- [x] Build a minimal writing inventory from the old site repo’s card list
  - [x] Use: `davidwebstar34/davidwebstar.com/src/app/mockcards.ts` as source catalogue
- [x] Create a clean writing data file in the new site repo
  - [x] Add `src/app/content/writing.ts` (or `src/assets/content/writing.json`)
  - [x] Each item: title, 1-sentence abstract, link, type (essay/talk), status (published/draft)
- [x] Update `src/app/writing/writing.component.html` to render from the inventory

## Asset reuse and visual coherence

- [x] Copy re-usable images from the old private site repo into the new public site repo
  - [x] Source: `davidwebstar34/davidwebstar.com/src/assets/images/*`
  - [x] Destination: `webstarcloud/webstarcloud.com/src/assets/media/*`
  - [x] Rename files to a clean slug format
- [x] Create three new diagram images using Holodeck (or equivalent)
  - [x] Export as PNG (dark theme) into `src/assets/media/diagrams/`
  - [x] Diagram 1: constraint-first decisioning (guardrails + invariants)
  - [x] Diagram 2: irreversible migration pattern (shadow compute + truth table)
  - [x] Diagram 3: agentic containment (fail-safe mesh + escalation)

## Tone and UI discipline

- [x] Remove any remaining “agency” wording
  - [x] Update `src/app/app.component.html`: change “Engage” CTA label
- [x] Enforce single-accent discipline in CSS
  - [x] Update `src/styles.css`
    - [x] Replace blue-tinted button shadow with purple-tinted shadow
- [x] Optional: remove Bootstrap dependency if unused
  - [x] Update `src/index.html`: remove Bootstrap `<link>` and verify no breakage

## Unify GitHub repo front doors (portfolio packaging)

- [x] agent-swarmkit: add “portfolio-ready” header and link back to davidwebstar.com
  - [x] Update `davidwebstar34/agent-swarmkit/README.md`
  - [x] Add: short “Primitive / Guarantees / Non-guarantees” summary block at top
- [x] news-radar: add one screenshot + “why it matters” summary
  - [x] Update `davidwebstar34/news-radar/README.md`
- [x] semblance: clarify the primitive and add a small diagram in README
  - [x] Update `davidwebstar34/semblance/README.md`
- [x] holodeck: write a real README and add 2–3 example exports
  - [x] Update `davidwebstar34/holodeck/README.md`
  - [x] Add `docs/examples/` with exported PNGs/SVGs

## Exact files to update in webstarcloud/webstarcloud.com

- [x] Update core brand surfaces
  - [x] `src/index.html`
  - [x] `src/styles.css`
  - [x] `src/app/app.component.html`
  - [x] `src/app/app.component.css`
- [x] Update content pages
  - [x] `src/app/home/home.component.html`
  - [x] `src/app/selected-work/selected-work.component.html`
  - [x] `src/app/rd/rd.component.html`
  - [x] `src/app/writing/writing.component.html`
  - [x] `src/app/about/about.component.html`
- [x] Update assets
  - [x] `src/assets/og.png` (new)
  - [x] `src/assets/og.svg` (optional source)
  - [x] `src/assets/media/...` (new)
