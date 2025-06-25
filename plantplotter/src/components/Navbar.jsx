'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'My Gardens', href: '/gardens'},
  { label: 'Garden Planner', href: '/garden'},
  { label: 'Tracker', href: '/tracker'},
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-green-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-white text-xl font-bold flex items-center gap-2">
          <Image src="/logo.svg" alt="PlantPlotter Logo" width={32} height={32} /> 
          <span>PlantPlotter</span>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop menu */}
        <ul className="hidden md:flex space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-1 px-3 py-2 rounded-md transition ${
                  mounted && pathname === item.href
                    ? 'bg-green-700 text-white font-semibold'
                    : 'text-white hover:bg-green-800 hover:text-green-100'
                }`}
              >
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div className="md:hidden bg-green-800 border-t border-green-700 px-4 py-2 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm ${
                mounted && pathname === item.href
                  ? 'bg-green-700 text-white font-semibold'
                  : 'text-white hover:bg-green-700 hover:text-green-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}