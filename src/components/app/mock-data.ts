import type { StatusTone } from './types';

export interface BatchResultItem {
  brand: string;
  href: string;
  id: string;
  label: string;
  tone: StatusTone;
  type: string;
}

export const BATCH_RESULTS: BatchResultItem[] = [
  {
    brand: 'Good Times Rye',
    href: '/reviews/demo20_001',
    id: 'COL-01',
    label: 'Pass',
    tone: 'pass',
    type: 'Straight Rye',
  },
  {
    brand: 'Good Old Times Light Whiskey',
    href: '/reviews/demo20_002',
    id: 'COL-02',
    label: 'Pass',
    tone: 'pass',
    type: 'Light Whiskey',
  },
  {
    brand: 'Portuguese Cigar Good Times',
    href: '/reviews/demo20_003',
    id: 'COL-03',
    label: 'Needs Review',
    tone: 'review',
    type: 'Cigar Blend',
  },
  {
    brand: 'Saperavi Qvevri Wine',
    href: '/reviews/demo20_004',
    id: 'COL-04',
    label: 'Pass',
    tone: 'pass',
    type: 'Red Wine',
  },
  {
    brand: 'Lakewood Five Texas Gin',
    href: '/reviews/demo20_005',
    id: 'COL-05',
    label: 'Likely Fail',
    tone: 'fail',
    type: 'Gin',
  },
  {
    brand: 'Good Times Double Oak',
    href: '/reviews/demo20_008',
    id: 'COL-08',
    label: 'Needs Review',
    tone: 'review',
    type: 'Bourbon',
  },
];
