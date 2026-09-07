import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Garden Details',
  'View and update a saved PlantPlotter garden.'
);

export default function GardenDetailsLayout({ children }) {
  return children;
}
