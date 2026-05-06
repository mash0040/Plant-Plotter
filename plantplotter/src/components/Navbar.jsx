'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, User } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

// Navigation items that require authentication
const authenticatedNavItems = [
  { label: 'My Gardens', href: '/gardens'},
  { label: 'Garden Planner', href: '/garden'},
  { label: 'Tracker', href: '/tracker'},
];

// Navigation items for non-authenticated users
const publicNavItems = [
  { label: 'Home', href: '/' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Use the auth hook
  const { user, logout, loading } = useAuth();

  // Helper function to get display name
  const getDisplayName = (user) => {
    if (!user) return '';
    // Priority: username > name > email (fallback)
    return user.username || user.name || user.email || 'User';
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu) {
        const userMenu = event.target.closest('[data-user-menu]');
        const userButton = event.target.closest('[data-user-button]');
        
        if (!userMenu && !userButton) {
          setShowUserMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Redirect non-authenticated users from protected routes
  useEffect(() => {
    if (mounted && !loading && !user) {
      const protectedRoutes = ['/gardens', '/garden', '/tracker', '/profile', '/preferences'];
      if (protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
        router.replace('/login');
      }
    }
  }, [mounted, user, pathname, router, loading]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setMenuOpen(false);
    router.replace('/login');
  };

  // Don't render anything during loading
  if (!mounted || loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-green-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-white text-xl font-bold flex items-center gap-2">
            <Image src="/PlantPlotter.svg" alt="PlantPlotter Logo" width={32} height={32} /> 
            <span>PlantPlotter</span>
          </div>
          <div className="w-8 h-8"></div> {/* Placeholder for loading */}
        </div>
      </nav>
    );
  }

  // Get navigation items based on authentication status
  const navItems = user ? authenticatedNavItems : publicNavItems;
  const displayName = getDisplayName(user);
  const isAuthPage = ['/login', '/create-account', '/forgot-password', '/reset-password'].includes(pathname);
  const isLandingPage = pathname === '/';
  const showMobileMenuButton = Boolean(user) || (!isAuthPage && !isLandingPage);
  const publicActionHref = isAuthPage ? '/' : '/login';
  const publicActionLabel = isAuthPage ? 'Home' : 'Sign In';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-green-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link 
          href={user ? '/gardens' : '/'} 
          className="text-white text-xl font-bold flex items-center gap-2 hover:text-green-100 transition-colors"
          title={user ? 'Go to My Gardens' : 'Go to Home'}
        >
          <Image src="/PlantPlotter.svg" alt="PlantPlotter Logo" width={32} height={32} /> 
          <span>PlantPlotter</span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center space-x-6">
          {/* Show navigation items only if user is authenticated */}
          {user && (
            <ul className="flex space-x-6 text-sm font-medium">
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
          )}

          {/* User Menu - Desktop */}
          {user ? (
            <div className="relative">
              <button
                data-user-button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-white hover:bg-green-800 transition-colors"
              >
                <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                  {user.avatar ? (
                    <Image 
                      src={user.avatar} 
                      alt="User avatar" 
                      width={32} 
                      height={32} 
                      className="rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span className="text-sm font-medium">{displayName}</span>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div 
                  data-user-menu
                  className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</p>
                  </div>
                  
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Profile Settings
                  </Link>
                  
                  <Link
                    href="/profile?tab=preferences"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Preferences
                  </Link>
                  
                  <div className="border-t border-gray-100 mt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={publicActionHref}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              {publicActionLabel}
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        {showMobileMenuButton ? (
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        ) : (
          <Link
            href={publicActionHref}
            className="md:hidden rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            {publicActionLabel}
          </Link>
        )}
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && showMobileMenuButton && (
        <div className="md:hidden bg-green-800 border-t border-green-700">
          {/* Navigation Links - only show if user is authenticated */}
          {user && (
            <div className="px-4 py-2 space-y-2">
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

          {/* User Section - Mobile */}
          <div className="border-t border-green-700 px-4 py-2">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 text-white">
                  <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <Image 
                        src={user.avatar} 
                        alt="User avatar" 
                        width={32} 
                        height={32} 
                        className="rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-green-200 truncate" title={user.email}>{user.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1 mt-2">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-white hover:bg-green-700 rounded-md transition-colors"
                  >
                    Profile Settings
                  </Link>
                  
                  <Link
                    href="/profile?tab=preferences"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-white hover:bg-green-700 rounded-md transition-colors"
                  >
                    Preferences
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-200 hover:bg-red-800 rounded-md transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
