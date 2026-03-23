export type WritingType = 'essay' | 'talk';
export type WritingStatus = 'published' | 'draft';

export interface WritingItem {
  title: string;
  abstract: string;
  link: string;
  type: WritingType;
  status: WritingStatus;
}

export const WRITING_ITEMS: WritingItem[] = [
  {
    title: 'When AWS Practice is not well-architected, the war will be lost',
    abstract: 'A constraint-first reflection on architecture discipline before scaling amplifies drift.',
    link: 'https://stories.schubergphilis.com/when-aws-practice-is-not-well-architected-the-war-will-be-lost-138ca273089c',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'Turbo charge your AWS Control Tower',
    abstract: 'Governance patterns for a stronger day-one cloud foundation with clearer guardrails.',
    link: 'https://stories.schubergphilis.com/turbo-charge-you-aws-control-tower-44fad7a62f50',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'AWS Cloudshell sessions with AWS Session Manager',
    abstract: 'A practical walkthrough for secure shell access in private VPC environments.',
    link: 'https://stories.schubergphilis.com/aws-cloudshell-sessions-with-aws-session-manager-221fdb2bd1d',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'AWS Usergroup NL + BE re:invent recap',
    abstract: 'Talk recap covering key re:Invent themes and practical architectural takeaways.',
    link: 'https://www.youtube.com/watch?v=88salSCeEEA&t=6833s',
    type: 'talk',
    status: 'published',
  },
  {
    title: 'Enterprise-ready golden images with one engineer',
    abstract: 'How to scale secure image delivery with minimal operational overhead.',
    link: 'https://stories.schubergphilis.com/enterprise-ready-golden-images-with-one-engineer-98303f118e4a',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'How Schuberg Philis stays in Control with AWS',
    abstract: 'Talk on applying shared-responsibility thinking to practical control-plane governance.',
    link: 'https://youtu.be/y4QzlV7TPx0',
    type: 'talk',
    status: 'published',
  },
  {
    title: 'Diary of an AWS Fanboy',
    abstract: 'Early operating notes on building customer-first AWS practices at an advanced partner.',
    link: 'https://stories.schubergphilis.com/diary-of-an-aws-fanboy-d742f1066547',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'Day in the life of a Netflix engineer',
    abstract: 'A high-signal social post translating platform-scale engineering statistics to broad audiences.',
    link: 'https://www.linkedin.com/posts/webstar_aws-netflix-engineers-activity-6535831129021345792-30Po',
    type: 'essay',
    status: 'published',
  },
  {
    title: 'AWS Popup loft South Africa',
    abstract: 'A short field note from the AWS community circuit and architecture leadership events.',
    link: 'https://twitter.com/WebstarDavid/status/1102862730095198209',
    type: 'talk',
    status: 'published',
  },
];
