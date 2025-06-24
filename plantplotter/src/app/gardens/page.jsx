'use client';
import GardenCard from '@/components/Gardens/GardenCard';
import { useEffect, useState } from 'react';
import { getGardens } from '@/lib/api';

export default function AllGardensPage() {
  const [gardens, setGardens] = useState([]);

  useEffect(() => {
    getGardens().then(setGardens);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Gardens</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gardens.map(garden => (
          <GardenCard key={garden.id} garden={garden} />
        ))}
      </div>
    </div>
  );
}