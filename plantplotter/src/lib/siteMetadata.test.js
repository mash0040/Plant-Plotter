import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import {
  createNoIndexMetadata,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL
} from './siteMetadata';

describe('site metadata', () => {
  it('uses the canonical production URL and product identity', () => {
    expect(SITE_URL).toBe('https://www.plantplotter.me');
    expect(SITE_NAME).toBe('PlantPlotter');
    expect(SITE_DESCRIPTION).toContain('garden');
  });

  it('marks account and application pages as no-index', () => {
    expect(createNoIndexMetadata('Garden Tracker')).toEqual({
      title: 'Garden Tracker',
      robots: {
        index: false,
        follow: false,
        noarchive: true
      }
    });
  });

  it('publishes only the public landing page in the sitemap', () => {
    expect(sitemap()).toEqual([
      {
        url: SITE_URL,
        changeFrequency: 'monthly',
        priority: 1
      }
    ]);
  });

  it('keeps protected application routes out of crawler access', () => {
    const metadata = robots();

    expect(metadata.rules.allow).toBe('/');
    expect(metadata.rules.disallow).toEqual([
      '/garden',
      '/gardens',
      '/profile',
      '/tracker'
    ]);
    expect(metadata.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('provides install metadata using the same product identity', () => {
    expect(manifest()).toMatchObject({
      name: SITE_NAME,
      short_name: SITE_NAME,
      description: SITE_DESCRIPTION,
      start_url: '/',
      display: 'standalone',
      theme_color: '#14532d'
    });
  });
});
