'use client';
import { useState } from 'react';

export default function TrackingCalendar() {
  const [logs] = useState([
    { date: '2025-06-01', type: 'Watered', plant: 'Tomatoes' },
    { date: '2025-06-03', type: 'Fertilized', plant: 'Carrots' },
  ]);

  return (
    <div className="space-y-4">
      {logs.map((log, idx) => (
        <div key={idx} className="p-3 border rounded bg-green-50 dark:bg-neutral-800">
          <strong>{log.date}</strong>: {log.type} – {log.plant}
        </div>
      ))}
    </div>
  );
}