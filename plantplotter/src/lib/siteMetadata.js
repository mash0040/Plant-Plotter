export const SITE_NAME = 'PlantPlotter';
export const SITE_URL = 'https://www.plantplotter.me';
export const SITE_TITLE = 'PlantPlotter | Plan, Plant & Track Your Garden';
export const SITE_DESCRIPTION =
  'Design garden layouts, plan plant placement, and keep up with care tasks in one practical garden workspace.';
export const SOCIAL_IMAGE_PATH = '/opengraph-image';

export function createNoIndexMetadata(title, description) {
  return {
    title,
    ...(description ? { description } : {}),
    robots: {
      index: false,
      follow: false,
      noarchive: true
    }
  };
}
