// app/layout.js
'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/hooks/useAuth"; 
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AuthProvider>
          <Navbar />
          <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
