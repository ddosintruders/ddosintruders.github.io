/**
 * Four signals, every one traceable to the CV.
 *
 * These replace the previous site's "10+ projects / 2+ years / 500+ views",
 * which were unverifiable and read as padding. Nothing here is an estimate:
 * if a number could not be sourced from the CV it is not on the page.
 */

export type Metric = {
  /** Numeric portion — counted up on reveal. */
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Where the number comes from, shown small beneath the label. */
  source: string;
  /** Counters only make sense for real quantities; this one is a duration. */
  decimals?: number;
};

export const metrics: Metric[] = [
  {
    value: 95,
    suffix: '%+',
    label: 'Sustained quality score',
    source: 'AI Expert Generalist, micro1',
  },
  {
    value: 5,
    label: 'Internal tools shipped',
    source: 'Audit, QA, fraud detection & reporting',
  },
  {
    value: 1,
    suffix: ' mo',
    label: 'Annotator to pipeline lead',
    source: 'Jan 2026 → Feb 2026',
  },
  {
    value: 2,
    label: 'Concurrent frontier-AI roles',
    source: 'human depth · micro1',
  },
];
