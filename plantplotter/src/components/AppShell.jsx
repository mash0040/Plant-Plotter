'use client';

import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/hooks/useAuth';

export default function AppShell({ children }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>
      <Footer />
    </AuthProvider>
  );
}
