import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import Banner from '@/components/Banner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Plant Plotter",
  description: "Plan your garden with drag-and-drop ease",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 dark:bg-neutral-900 dark:text-white">
        <Banner />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
