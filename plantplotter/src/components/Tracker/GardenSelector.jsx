'use client';
import React from 'react';
import { Leaf } from 'lucide-react';

// Helper function to get appropriate garden icon
const getGardenIcon = (garden) => {
  if (!garden) return '🌱';
  
  // If garden already has an icon, use it
  if (garden.icon) return garden.icon;
  
  const name = garden.name.toLowerCase();
  const location = garden.location?.toLowerCase() || '';
  
  // Icon mapping based on garden name keywords
  if (name.includes('vegetable') || name.includes('veggie')) return '🥕';
  if (name.includes('herb') || name.includes('culinary')) return '🌿';
  if (name.includes('flower') || name.includes('blossom')) return '🌸';
  if (name.includes('fruit') || name.includes('orchard')) return '🍎';
  if (name.includes('berry')) return '🍓';
  if (name.includes('container') || name.includes('pot')) return '🪴';
  if (name.includes('indoor') || location.includes('indoor')) return '🏠';
  if (name.includes('balcony') || location.includes('balcony')) return '🏢';
  if (name.includes('rooftop') || location.includes('rooftop')) return '🏙️';
  if (name.includes('greenhouse') || location.includes('greenhouse')) return '🏡';
  
  // Location-based icons
  if (location.includes('backyard') || location.includes('back yard')) return '🏡';
  if (location.includes('front yard') || location.includes('frontyard')) return '🏠';
  if (location.includes('kitchen')) return '👩‍🍳';
  if (location.includes('windowsill') || location.includes('window')) return '🪟';
  
  // Default garden icon
  return '🌱';
};

export default function GardenSelector({ gardens, selectedGarden, onGardenSelect }) {
  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 opacity-10 pointer-events-none">
        <Leaf className="w-32 h-32 text-green-600 transform rotate-12" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-xl">🏡</span>
        Gardens
      </h3>
      
      <div className="space-y-3">
        {gardens.map((garden) => {
          const isSelected = selectedGarden?.id === garden.id;
          const gardenIcon = getGardenIcon(garden);
          
          return (
            <button
              key={garden.id}
              onClick={() => onGardenSelect(garden)}
              className={`relative z-10 w-full p-3 rounded-xl text-left cursor-pointer transition-all duration-200 flex items-center gap-3 ${
                isSelected
                  ? 'bg-green-100 border-2 border-green-300 shadow-md transform scale-[1.02]'
                  : 'bg-white/80 border border-gray-200 hover:bg-green-50 hover:border-green-200 hover:shadow-sm'
              }`}
            >
              {/* Garden Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                isSelected ? 'bg-green-200' : 'bg-gray-100'
              }`}>
                {gardenIcon}
              </div>
              
              {/* Garden Info */}
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm leading-tight truncate ${
                  isSelected ? 'text-green-800' : 'text-gray-800'
                }`}>
                  {garden.name}
                </h4>
                
                {garden.location && (
                  <p className={`text-xs mt-1 truncate ${
                    isSelected ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    📍 {garden.location}
                  </p>
                )}
                
                {/* Plant count if available */}
                {garden.plantCount !== undefined && (
                  <p className={`text-xs mt-1 ${
                    isSelected ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    🌱 {garden.plantCount} plants
                  </p>
                )}
              </div>
              
              {/* Status indicator */}
              {garden.status && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  garden.status === 'Active' 
                    ? 'bg-green-100 text-green-700'
                    : garden.status === 'Planning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {garden.status}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {gardens.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🌱</span>
          </div>
          <p className="text-gray-500 text-sm">No gardens available</p>
          <a 
            href="/gardens" 
            className="text-green-600 hover:text-green-700 text-sm font-medium mt-2 inline-block"
          >
            Create your first garden
          </a>
        </div>
      )}
    </div>
  );
}
