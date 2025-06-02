'use client';
import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const mockData = {
  '2025-06-01': { water: true, fertilize: false, daysSincePlanted: 5, growDays: 60 },
  '2025-06-03': { water: false, fertilize: true, daysSincePlanted: 7, growDays: 60 },
};

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function TrackingCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateKey = formatDate(selectedDate);
  const record = mockData[dateKey];

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="w-full md:w-1/2">
        <Calendar onChange={setSelectedDate} value={selectedDate} className="rounded shadow" />
      </div>
      <div className="flex-1 p-4 border rounded bg-white dark:bg-gray-800 dark:text-white">
        <h2 className="text-lg font-semibold mb-2">🗓 {dateKey}</h2>
        {record ? (
          <ul className="space-y-1">
            <li>💧 Watered: <strong>{record.water ? 'Yes' : 'No'}</strong></li>
            <li>🌿 Fertilized: <strong>{record.fertilize ? 'Yes' : 'No'}</strong></li>
            <li>🌱 Progress: <strong>{record.daysSincePlanted} / {record.growDays} days</strong></li>
            <li>📈 Remaining: <strong>{record.growDays - record.daysSincePlanted} days</strong></li>
          </ul>
        ) : (
          <p className="text-gray-500">No records found for this day.</p>
        )}
      </div>
    </div>
  );
}