/**
 * Capabilities, taken verbatim from the CV's Core Competencies block.
 *
 * Grouped rather than listed flat so the three sides of the positioning —
 * operations, leadership, engineering — are legible at a glance.
 *
 * No proficiency percentages. Self-assessed skill bars are noise: they claim
 * precision nobody can verify and every portfolio sets its own to 90%.
 */

export type CapabilityGroup = {
  index: string;
  title: string;
  note: string;
  items: string[];
};

export const capabilities: CapabilityGroup[] = [
  {
    index: '01',
    title: 'Operations',
    note: 'Running the pipeline, not just working in it.',
    items: [
      'Data Pipeline Operations & Management',
      'Quality Assurance & Fraud Detection',
      'Onboarding & Payments Operations',
      'KPI Definition & Reporting',
      'Process Optimization',
    ],
  },
  {
    index: '02',
    title: 'Leadership',
    note: 'Setting the quality bar and holding it.',
    items: [
      'Team Leadership & People Management',
      'Cross-Functional Project Management',
      'Client & Stakeholder Communication',
    ],
  },
  {
    index: '03',
    title: 'Engineering',
    note: 'Building the tools the work needed.',
    items: [
      'Python',
      'Google Apps Script',
      'Chrome Extension Development',
      'QML & Qt',
      'Computer Vision (MediaPipe)',
      'LiDAR Data',
    ],
  },
];
