export interface PillarDefinition {
  label: 'R&D' | 'Systems' | 'Primitives' | 'Judgement';
  definition: string;
}

export const PILLAR_DEFINITIONS: PillarDefinition[] = [
  {
    label: 'R&D',
    definition: 'Probe uncertain design spaces early with measurable experiments before committing at scale.',
  },
  {
    label: 'Systems',
    definition: 'Design end-to-end behavior across services, teams, and operational boundaries.',
  },
  {
    label: 'Primitives',
    definition: 'Build small, durable building blocks that hold under stress and composition.',
  },
  {
    label: 'Judgement',
    definition: 'Make tradeoffs explicit with clear constraints, recovery paths, and accountability.',
  },
];

export const PHRASE_ROTATION: string[] = [
  'invariants',
  'containment',
  'recovery paths',
  'blast radius',
  'auditability',
  'drift',
];
