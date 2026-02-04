# DESIGN — Visual System (v1)

## Color Palette
- Background 0: `#0B0F14` (charcoal / near‑black)
- Background 1: `#0F1622` (deep slate)
- Background 2: `#141F2E` (navy shadow)
- Primary text: `#EEF3FF` (cool white)
- Secondary text: `#C6D3E5`
- Muted text: `#8D9BB1`
- Accent (single): `#6F5BFF` (cool purple, blue-leaning)
- Accent strong: `#5A3DFF`

## Typography
- Primary font: Space Grotesk (clean sans‑serif)
- Secondary font: IBM Plex Mono (labels, code, metadata)

## Heading Scale & Spacing
- H1: `clamp(2.6rem, 4.5vw, 4rem)`
- H2: `clamp(1.6rem, 2.4vw, 2.2rem)`
- H3: `1.2rem`–`1.4rem`
- Body: `1rem`–`1.1rem`
- Spacing scale: 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96

## Visual Rules
- Dark‑mode first, high contrast, cool‑toned.
- Accent color used sparingly for focus and calls‑to‑action.
- Surfaces use subtle depth (soft borders + shadow).
- No warm backgrounds; avoid purple bias.

## Avatar Strategy
Primary identity: stylized Three.js avatar (not hyper‑realistic).

Constraints:
- Stylized, cool‑toned lighting
- Calm, neutral expression
- Subtle motion only (idle, attention shift)
- No auto‑interruptions; explicit activation required

## Photography (Optional)
- Dark, solid clothing
- Cool lighting (5000–5600K)
- Chest‑up framing
- No warm backgrounds
