'use client';
import React from 'react';
import { Droplets, Sprout, Scissors } from 'lucide-react';

export default function QuickActions({ onQuickAction, selectedGarden }) {
  const actions = [
    { 
      id: 'planted', 
      label: 'Planted', 
      icon: Sprout, 
      color: 'text-green-600' 
    },
    { 
      id: 'watered', 
      label: 'Watered', 
      icon: Droplets, 
      color: 'text-blue-600' 
    },
    { 
      id: 'fertilized', 
      label: 'Fertilized', 
      icon: 'div', 
      color: 'bg-yellow-600',
      isDiv: true
    },
    { 
      id: 'harvested', 
      label: 'Harvested', 
      icon: Scissors, 
      color: 'text-red-600' 
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex flex-col items-left justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Quick Action</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          for {selectedGarden.icon} {selectedGarden.name}
        </div>
      </div>
      <div className="space-y-2">
        {actions.map(action => {
          const IconComponent = action.icon;
          
          return (
            <button 
              key={action.id}
              onClick={() => onQuickAction(action.id)}
              className="flex items-center space-x-3 w-full p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {action.isDiv ? (
                <div className={`w-4 h-4 ${action.color} rounded`}></div>
              ) : (
                <IconComponent className={`w-4 h-4 ${action.color}`} />
              )}
              <span className="text-gray-900 dark:text-white">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}