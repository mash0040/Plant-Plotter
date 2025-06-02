'use client';
import TrackingCalendar from '@/components/TrackingCalendar';

export default function TrackingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Garden Activity Tracker</h1>
      <TrackingCalendar />
    </div>
  );
}