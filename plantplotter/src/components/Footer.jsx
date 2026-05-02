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
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-green-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Plant Plotter &copy; {currentYear}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p>Built by Ekene Masha</p>
          <a
            href="https://github.com/mash0040/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:text-green-200 hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/mashaak"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:text-green-200 hover:underline"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
