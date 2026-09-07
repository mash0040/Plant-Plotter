import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Sign In',
  'Sign in to your PlantPlotter account.'
);

export default function LoginLayout({ children }) {
  return children;
}
