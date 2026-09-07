import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Garden Tracker',
  'Track garden care tasks and activities in PlantPlotter.'
);

export default function TrackerLayout({ children }) {
  return children;
}
