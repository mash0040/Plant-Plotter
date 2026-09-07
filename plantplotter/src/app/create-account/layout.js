import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Create an Account',
  'Create a PlantPlotter account.'
);

export default function CreateAccountLayout({ children }) {
  return children;
}
