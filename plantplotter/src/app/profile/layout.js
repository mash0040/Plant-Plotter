import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Profile Settings',
  'Manage your PlantPlotter profile and preferences.'
);

export default function ProfileLayout({ children }) {
  return children;
}
