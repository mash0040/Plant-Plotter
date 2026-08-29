import Link from 'next/link';
import { Home, Leaf, Sprout } from 'lucide-react';

export const metadata = {
  title: 'Page not found | PlantPlotter'
};

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12">
      <section className="w-full max-w-xl rounded-2xl border border-green-100 bg-white p-6 text-center shadow-lg sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <Sprout className="h-7 w-7 text-green-700" aria-hidden="true" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-700 sm:text-base">
          This page does not exist. Check the address, or head back to your gardens.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/gardens"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            <Leaf className="h-4 w-4" aria-hidden="true" />
            My Gardens
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-800 transition-colors hover:bg-green-50"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </section>
    </div>
  );
}
