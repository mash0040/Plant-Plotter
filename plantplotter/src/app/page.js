'use client';
import Link from 'next/link';
import { Leaf, Sprout, TrendingUp, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Leaf,
    title: 'Plan your garden',
    description: 'Layout tools with companion guidance and spacing.'
  },
  {
    icon: Sprout,
    title: 'Track care activities',
    description: 'Log watering, fertilizing, harvests, and care tasks per plant.'
  },
  {
    icon: TrendingUp,
    title: 'See progress over time',
    description: 'Calendar of care, today/upcoming/overdue task lists, and weather context.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col">
      <section className="text-center pt-6 pb-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white/70 px-3 py-1 text-xs font-medium text-green-700 shadow-sm">
          <Leaf className="w-3.5 h-3.5" />
          Garden planning, simplified
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
          Plan, plant, and track
          <span className="text-green-600 block">your garden.</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
          PlantPlotter helps you design garden layouts, log care activities, and stay on top of weekly tasks — all in one place.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/create-account"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-green-700 font-semibold rounded-xl transition-colors border border-green-200 shadow-sm"
          >
            Create an account
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto w-full pb-16">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-green-100"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
