'use client';
import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import DarkModeToggle from '@/components/DarkModeToggle';

const mockData = {
  '2025-06-01': { water: true, fertilize: false, daysSincePlanted: 5, growDays: 60 },
  '2025-06-03': { water: false, fertilize: true, daysSincePlanted: 7, growDays: 60 },
  // Add more records as needed
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function TrackingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = formatDate(selectedDate);
  const record = mockData[dateKey];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">🌿 Garden Activity Tracker</h1>
      <DarkModeToggle/>

      <div className="mt-6 p-4 bg-white shadow">
        <h2 className="text-lg font-bold">🗓 {dateKey}</h2>
        <TrackingCalendar/>
      </div>
    </div>
  );
}