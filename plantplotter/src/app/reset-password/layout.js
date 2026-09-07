import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Choose a New Password',
  'Choose a new password for your PlantPlotter account.'
);

export default function ResetPasswordLayout({ children }) {
  return children;
}
