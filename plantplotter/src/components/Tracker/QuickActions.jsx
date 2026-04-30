'use client';
import React from 'react';
import { Droplets, Sprout, Scissors } from 'lucide-react';

export default function QuickActions({
  onQuickAction,
  selectedGarden,
  disabled = false,
  helperText = '',
  managePlantsHref = ''
}) {
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
    },
    { 
      id: 'pruned', 
      label: 'Pruned', 
      icon: Scissors, 
      color: 'text-purple-600' 
    },
    { 
      id: 'weeded', 
      label: 'Weeded', 
      icon: Sprout, 
      color: 'text-emerald-600' 
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex flex-col items-left justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Quick Log</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          for {selectedGarden.name}
        </div>
      </div>
      <div className="space-y-2">
        {actions.map(action => {
          const IconComponent = action.icon;
          
          return (
            <button 
              key={action.id}
              onClick={() => onQuickAction(action.id)}
              disabled={disabled}
              className="flex items-center space-x-3 w-full p-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      {disabled && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          {helperText}
          {managePlantsHref && (
            <a
              href={managePlantsHref}
              className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800"
            >
              Manage Plants
            </a>
          )}
        </p>
      )}
    </div>
  );
}
