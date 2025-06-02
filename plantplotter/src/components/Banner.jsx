'use client';
import Image from 'next/image';

export default function Banner() {
  return (
    <div className="w-full bg-green-800 text-white px-4 py-3 flex justify-between items-center shadow-md">
      <div className="flex items-center gap-2">
        <Image src="/logo.svg" alt="PlantPlotter Logo" width={32} height={32} />
        <span className="text-xl font-bold">PlantPlotter</span>
      </div>
      <div className="text-sm">
        <span className="mr-4">📍 Location: Custom Garden</span>
        <span>☀️ Weather: Sunny</span>
      </div>
    </div>
  );
}