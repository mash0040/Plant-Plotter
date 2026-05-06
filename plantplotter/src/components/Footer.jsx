'use client';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname === '/garden') {
    return null;
  }

  return (
    <footer className="mt-12 border-t border-green-800 bg-green-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-5 text-center text-sm text-green-100 sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p className="whitespace-nowrap font-medium">Plant Plotter &copy; {currentYear}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
          <p className="whitespace-nowrap text-green-100">Ekene Masha</p>
          <a
            href="https://github.com/mash0040/"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-medium text-white hover:text-green-200 hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/mashaak"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-medium text-white hover:text-green-200 hover:underline"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
