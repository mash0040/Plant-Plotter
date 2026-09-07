import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import AppShell from '@/components/AppShell';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL
} from '@/lib/siteMetadata';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Ekene Masha' }],
  creator: 'Ekene Masha',
  publisher: SITE_NAME,
  category: 'technology',
  manifest: '/manifest.webmanifest'
};

export const viewport = {
  colorScheme: 'light',
  themeColor: '#14532d'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <body className="bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
