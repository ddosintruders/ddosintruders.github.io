/**
 * Single source of truth for identity, links and SEO.
 *
 * Deliberately absent, per the revamp brief:
 *   - the old public phone number (+254-759-888-524)
 *   - the Ko-fi widget (I2I51O7J3E)
 *   - adnanclever78@gmail.com, superseded by the address below
 */

export const site = {
  name: 'Adnan Ahmed',
  url: 'https://adnan-ahmed.pages.dev',

  title: 'Adnan Ahmed — Human Data, Quality Systems & Internal Tooling',
  description:
    'Founding Software Engineer at human depth and Human Data Expert at micro1. I build the audit, QA and fraud-detection tooling behind large-scale AI training data pipelines.',

  role: {
    primary: { title: 'Founding Software Engineer', company: 'human depth' },
    secondary: { title: 'Human Data Expert', company: 'micro1' },
  },

  location: 'Nakuru, Kenya',
  locationNote: 'Remote',

  email: 'adnan@humandepth.org',

  /**
   * Google Calendar appointment schedule.
   *
   * The `/u/0/` segment present in the originally-supplied link is intentionally
   * omitted: it pins the page to Google account index 0, which misroutes visitors
   * signed into more than one Google account. This is the form Google's own
   * "share booking page" action produces.
   */
  booking:
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1y1pO-VnXjmEky1-TEyJeM3DHpxg48JSmXNXa9mBZOR4BAd1ch9280pkA7UzfaMi5b3x1b-KsW?gv=true',

  /** Carried over from the previous site — endpoint is still live. */
  formspree: 'https://formspree.io/f/mzzjlnae',

  socials: [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/adnan-r-ahmed' },
    { label: 'GitHub', href: 'https://github.com/ddosintruders' },
  ],
} as const;

/**
 * Section registry. Drives the right-edge index rail, the scroll-spy active
 * state and the in-page anchors, so adding a section never means editing three
 * separate files.
 */
export const sections = [
  { id: 'hero', index: '00', label: 'Intro' },
  { id: 'metrics', index: '01', label: 'Signals' },
  { id: 'experience', index: '02', label: 'Experience' },
  { id: 'tooling', index: '03', label: 'Tooling' },
  { id: 'capabilities', index: '04', label: 'Capabilities' },
  { id: 'credentials', index: '05', label: 'Credentials' },
  { id: 'earlier', index: '06', label: 'Earlier' },
  { id: 'archive', index: '07', label: 'Archive' },
  { id: 'contact', index: '08', label: 'Contact' },
] as const;

export type SectionId = (typeof sections)[number]['id'];
