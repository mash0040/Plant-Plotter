import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Garden Planner',
  'Plan plant placement in your PlantPlotter garden.'
);

export default function GardenPlannerLayout({ children }) {
  return children;
}
