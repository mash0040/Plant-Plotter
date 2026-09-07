import { SITE_URL } from '@/lib/siteMetadata';

export default function sitemap() {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1
    }
  ];
}
