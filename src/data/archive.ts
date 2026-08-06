/**
 * Design archive — deliberately de-emphasised.
 *
 * These are self-directed brand exercises for fictional companies (Silica, AUDE,
 * ChowTown) plus real client and studio work (DuoMotion, misc). They are kept for
 * range, labelled honestly, and given no more weight than that.
 *
 * Lives in TS rather than a content collection so the images resolve to real
 * ImageMetadata and go through astro:assets. The previous site shipped these as
 * unoptimised multi-megabyte PNGs and warned visitors they might not load.
 */

const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/archive/*.{png,jpg,jpeg}',
  { eager: true },
);

/** Resolve by filename, failing loudly at build time if a rename breaks a reference. */
function img(name: string): ImageMetadata {
  const match = files[`../assets/archive/${name}`];
  if (!match) {
    throw new Error(
      `Archive image "${name}" not found. Available: ${Object.keys(files).join(', ')}`,
    );
  }
  return match.default;
}

export type ArchiveProject = {
  slug: string;
  title: string;
  kind: string;
  year: string;
  blurb: string;
  images: ImageMetadata[];
};

export const archive: ArchiveProject[] = [
  {
    slug: 'silica',
    title: 'Silica Designs & Systems',
    kind: 'Self-directed brand exercise',
    year: '2024',
    blurb:
      'A fictional semiconductor and device company with a Linux-derived ecosystem. Identity, sub-brands and product mockups, briefed and art-directed by me.',
    images: [
      img('silica-designs-logo.png'),
      img('silica-systems-logo.png'),
      img('silica-halogenos-logo.png'),
      img('silica-halogenos-mockup.png'),
      img('silica-luminaos-logo.png'),
      img('silica-laptop-mockup.png'),
    ],
  },
  {
    slug: 'aude',
    title: 'AUDE',
    kind: 'Self-directed brand exercise',
    year: '2024',
    blurb:
      'A fictional audio hardware brand. Wordmark, packaging direction and product imagery.',
    images: [img('aude-01.png'), img('aude-02.png'), img('aude-03.png'), img('aude-04.png')],
  },
  {
    slug: 'chowtown',
    title: 'ChowTown',
    kind: 'Self-directed brand exercise',
    year: '2024',
    blurb:
      'A fictional fast-food brand aimed at families. Logo, menu system and campaign posters.',
    images: [
      img('chowtown-logo.png'),
      img('chowtown-advert-poster.png'),
      img('chowtown-menu.png'),
      img('chowtown-yoghurt.png'),
    ],
  },
  {
    slug: 'duomotion',
    title: 'DuoMotion',
    kind: 'Co-founded studio — brand system',
    year: '2025',
    blurb:
      'Identity and collateral for the media studio I co-founded: logo, brand guide, business cards, social assets and client-facing documents. No longer operating.',
    images: [
      img('duomotion-logo.png'),
      img('duomotion-branding-guide.png'),
      img('duomotion-business-card.png'),
      img('duomotion-fb-cover.png'),
      img('duomotion-service-agreement.png'),
      img('duomotion-telegram-profile.png'),
    ],
  },
  {
    slug: 'misc',
    title: 'Client & pro-bono work',
    kind: 'Video, 360° and campaign work',
    year: '2024 — 2025',
    blurb:
      'Assorted production work with partners and contributors, including 360° tiny-planet capture and real estate campaign material.',
    images: [
      img('misc-tiny-planet.jpg'),
      img('misc-dining-hall.jpg'),
      img('misc-olivetrust.jpg'),
      img('misc-bwhispers-01.png'),
      img('misc-bwhispers-02.png'),
      img('misc-bwhispers-03.png'),
      img('misc-value-hook-poster.png'),
    ],
  },
];
