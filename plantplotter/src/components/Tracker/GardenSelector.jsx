'use client';
import React from 'react';

export default function GardenSelector({ gardens, selectedGarden, onGardenSelect }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Gardens</h3>
      <div className="space-y-2">
        {gardens.map(garden => (
          <div
            key={garden.id}
            className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
              selectedGarden.id === garden.id 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => onGardenSelect(garden)}
          >
            <span className="text-xl">{garden.icon}</span>
            <span className="text-gray-900 dark:text-white">{garden.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}