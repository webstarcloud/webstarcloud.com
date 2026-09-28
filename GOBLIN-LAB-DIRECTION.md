# Website direction — chat, research and support

## September 28: current direction

The homepage is now a minimal **Gobwen** chat surface. The original dodecahedron
is restored, with David Webster as the site identity. “Goblin Lab” is no longer
the repeated brand. Flash and Think initially target the same Qwen3.5-0.8B
checkpoint in its two generation modes; the GRPO Math variant remains a candidate
to evaluate. The home-trained Goblin is a separate, explicitly experimental option.

Navigation is Chat, Research, About. The avatar/funding chamber and proposed US$72
20B-token run move to About; the full career profile and legacy Dave's Brain demo
move to `/profile`. Research is an article index with dated results, model choices,
measurement methodology, architecture and open questions. The learning thesis
and paused-project decisions below still apply.

The interface is ready for a protected streaming gateway; inference, payments,
supporter entitlements and measured model benchmarks remain unconnected. See
`CHAT-GATEWAY.md` and `README.md` for implemented behavior and next integration
steps. The sections below retain the earlier positioning proposals as history,
not the current homepage specification.

## Earlier direction

Direction approved for implementation, 27 September 2026. The local site now uses
the structure below; see README.md for implemented routes and checks. Publishing
and changes to the company's recorded active bets remain separate actions.

## Positioning

**Goblin Lab** is the umbrella. **goblin-250M** is the current research project.
The lab can outgrow one model size while keeping a clear purpose:

> An independent lab exploring how intelligence is learned.

Keep `davidwebstar.com` as the domain and `webstarcloud.com` as the repository
name. Identify David Webster as the person behind the lab. Keep his engineering
experience and CV on an About page, rather than leading the research homepage
with career metrics.

The central question is broad enough to support future experiments but should
lead to specific tests: how do data, a model's starting structure and the training
process affect what it learns? Training a base model makes these variables
accessible. Useful capability and commercial value still need evidence.

## Proposed homepage copy

### Hero

**GOBLIN LAB**

**An independent lab exploring how intelligence is learned.**

We train small language models from scratch to investigate how data, structure
and training shape what they learn.

*Independent research by David Webster.*

Primary link: **Explore the research** → the current-work section below.

### Current research

**goblin-250M** · Experimental

A small language model trained from scratch, and a place to test ideas about
learning. The current work explores base-model training, evaluates checkpoints,
and compares changes to the training process.

The question: **what helps a small model learn useful capabilities?**

Goblin is an ongoing research project. Capabilities are still being evaluated.

Only add a “Read the experiments” link when a public research page exists. That
page should show dated experiments, the question tested, the comparison, results
and limitations. Do not turn training throughput or a falling loss curve into a
claim about general intelligence or assistant readiness.

### Supporting work

**llm-input-hardening** · Published tooling

Unicode-aware text inspection and hardening for language-model applications.
Inspect hidden characters, normalization changes and potentially misleading text
before it reaches the model.

Link: **Try the text inspector** → `/labs/llm-input-hardening` initially.

This tool supports text integrity. It does not establish protection against
arbitrary prompt injection, or imply that a Goblin integration is already live.

### Work with the lab

We work with selected teams on model training, AI systems and research engineering.

Link: **Get in touch** → `mailto:dwebster182@gmail.com`.

Use this as an invitation to collaborate; do not imply a larger team, existing
lab clients or completed commercial model-training engagements.

### Footer

Goblin Lab · Independent research by David Webster

About David · GitHub · Contact

## Keep the site small

Navigation: **Research · About · Contact**. Research can be an anchor on the
homepage. There is no need for separate Projects and Labs directories with only
one main research effort and one active supporting package.

| Work | Public presentation |
| --- | --- |
| goblin-250M | Main research focus, explicitly experimental. |
| llm-input-hardening | Secondary active tool with its existing inspector. |
| Dave's Brain | Future personal-model direction; omit a new homepage card for now. |
| Blacksmith, AnchorKeep, Greenlight, Holodeck, news-radar and other paused work | Remove from primary navigation and featured work. Preserve existing pages and mark paused demos clearly. |
| Career history and CV | About page; concise proof of engineering experience. |

Dave's Brain currently calls an external model through its Lambda backend. Keep
that existing demonstration distinct from the proposed personal model. Introduce
the new direction when there is a specific experiment or usable result to show.

## Implementation proposal

1. Add a focused lab homepage and move the current career material to About.
   Preserve the existing chat and input-hardening behavior during that move.
2. Replace the Projects/Labs navigation with the three links above. Make the
   former index routes lead to current research, and preserve shared detail URLs.
3. Keep the text inspector reachable. If its canonical path moves, retain the old
   path as a redirect and update the GitHub Pages route-shell build list.
4. Label retained paused demos. Do not delete their repositories or source code.
5. Update site title, description, social-preview metadata and structured data
   together with the visible branding. Avoid a stale career-themed preview image.
6. Verify a production build, relevant existing tests, direct route loads, and
   desktop/mobile layouts. Review the local result before publication.

The site already has uncommitted input-hardening and chat changes. Preserve them
and keep the branding changes reviewable. Deployment remains a separate action.

## Company direction

Suggested focus: Goblin as the main research bet; input hardening as maintained
supporting tooling; Dave's Brain as a later application. Park the remaining
initiatives explicitly instead of treating their visibility as an obligation to
continue them.

A website pivot does not itself validate a business. The next useful proof is a
bounded experiment showing a reproducible capability improvement, followed by a
clear account of who would find that capability useful. Research-engineering
engagements can be presented separately from claims about Goblin's capabilities.

## Research context

The wildebeest analogy suggests a research question about initial structure and
learning; it is not evidence that a particular model design will work.

- [TinyStories](https://arxiv.org/abs/2305.07759) demonstrates fluent story
  generation in a constrained setting with very small models and curated training
  data. It supports investigating data choices, not a claim that small models are
  already general-purpose assistants.
- [Injecting structural hints](https://arxiv.org/abs/2304.13060) studies how
  structured pretraining influences subsequent language learning. It offers an
  example of turning an intuition about starting structure into controlled tests.

Local grounding: `../goblin-250m/README.md`,
`../goblin-250m/docs/STATUS.md`, `../goblin-250m/docs/BASE-CAPABILITY-V1.md`,
`../llm-input-hardening/README.md`, `../davesbrain/README.md`, and this site's
current routes and components. Prefer dated experiment evidence over transient
“currently training” notices in project READMEs.


## September 27: chamber and funded runs

The main page now leans into Goblin's learning thesis, with David's original 3D
avatar inside a green glass incubation chamber. Liquid represents real verified
contributions, never a demo counter. The first proposed goal is US$72 for a 20B
run. Payment account and hosted runner are not connected; public copy says so.

An open notebook records the latest 2B result (better held-out loss, 0/9 on a
small correctness diagnostic), staged roadmap, existing/proposed architecture,
research questions with primary sources, and the funding plan. The longer-term
vision is a learner that retains knowledge and improves its learning efficiency,
with Dave's Brain and Codex/Claude/MCP use as future applications. These are
research aims, not claims of demonstrated continual learning or self-improvement.

Implementation and launch prerequisites: `funding-server/README.md`.
