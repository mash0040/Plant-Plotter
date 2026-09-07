import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'My Gardens',
  'Manage your saved gardens in PlantPlotter.'
);

export default function GardensLayout({ children }) {
  return children;
}
