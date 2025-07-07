import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import Navbar from '@/components/Navbar';


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
    <html lang="en" className="dark">
      <body className="bg-white dark:bg-gray-1200 text-gray-1200 dark:text-white">
        <Navbar />
        <main className="pt-12 px-1 sm:px-2 lg:px-4 max-w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
