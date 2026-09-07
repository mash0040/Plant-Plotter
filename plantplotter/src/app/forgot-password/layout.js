import { createNoIndexMetadata } from '@/lib/siteMetadata';

export const metadata = createNoIndexMetadata(
  'Reset Password',
  'Request a password reset for your PlantPlotter account.'
);

export default function ForgotPasswordLayout({ children }) {
  return children;
}
