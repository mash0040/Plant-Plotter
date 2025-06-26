'use client';
import { ArrowLeft, X, Search } from 'lucide-react';
import PlantLibraryItem from './PlantLibraryItem';

export default function PlantLibrary({ 
  plants, 
  searchTerm, 
  setSearchTerm, 
  isOpen, 
  onToggle 
}) {
  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPlants = filteredPlants.reduce((acc, plant) => {
    if (!acc[plant.category]) acc[plant.category] = [];
    acc[plant.category].push(plant);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-auto lg:top-0 lg:left-0 z-50
        bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        w-64 sm:w-72 lg:w-60
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-3 sm:p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 lg:hidden" />
              <h2 className="text-lg font-semibold">Plants</h2>
            </div>
            {onToggle && (
              <button 
                onClick={onToggle}
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {Object.entries(groupedPlants).map(([category, plants]) => (
            <div key={category} className="mb-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2 capitalize">{category}</h3>
              <div className="space-y-2">
                {plants.map((plant) => (
                  <PlantLibraryItem key={plant.id} plant={plant} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}