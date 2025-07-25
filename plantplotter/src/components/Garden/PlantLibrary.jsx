'use client';
import { ArrowLeft, X, Search, ChevronDown, ChevronUp, Heart, AlertTriangle, Info } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import PlantLibraryItem from './PlantLibraryItem';
import apiClient from '@/lib/api';

export default function PlantLibrary({ 
  searchTerm, 
  setSearchTerm, 
  isOpen, 
  onToggle,
  placedPlants = []
}) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCompanionGuide, setShowCompanionGuide] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});

  // Helper function to safely parse JSON or comma-separated strings
  const safeJsonParse = (value, fallback = []) => {
    if (!value) return fallback;
    
    // If it's already an array, return it
    if (Array.isArray(value)) return value;
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      // First, try JSON.parse
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (jsonError) {
        // If JSON parsing fails, try splitting by comma
        try {
          if (value.includes(',')) {
            return value.split(',').map(item => item.trim()).filter(Boolean);
          } else if (value.trim()) {
            return [value.trim()];
          }
        } catch (splitError) {
          console.warn('Failed to parse value as comma-separated:', value, splitError);
        }
      }
    }
    
    return fallback;
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌱 Loading plant library...');
      const plantLibrary = await apiClient.getPlantLibrary();
      console.log('📚 Raw plant library response:', plantLibrary);
      
      if (!Array.isArray(plantLibrary)) {
        throw new Error('Plant library response is not an array');
      }
      
      const transformedPlants = plantLibrary.map((plant, index) => {
        try {
          // Safe parsing of JSON fields
          const companionPlants = safeJsonParse(plant.companion_plants, []);
          const avoidPlants = safeJsonParse(plant.avoid_plants, []);
          const soilTypes = safeJsonParse(plant.soil_types, []);
          
          console.log(`🌿 Processing plant ${plant.name}:`, {
            companionPlants,
            avoidPlants,
            soilTypes
          });
          
          return {
            id: plant.id,
            name: plant.name,
            emoji: plant.emoji,
            size: plant.size || 1,
            category: plant.category,
            description: plant.description,
            spacing: plant.spacing,
            sunlight: plant.sunlight,
            waterNeeds: plant.water_needs,
            daysToMaturity: plant.days_to_maturity,
            companionPlants: companionPlants,
            avoidPlants: avoidPlants,
            soilTypes: soilTypes,
            difficulty: plant.difficulty,
            plantingDepth: plant.planting_depth
          };
        } catch (plantError) {
          console.error(`❌ Failed to transform plant ${plant.name}:`, plantError);
          // Return a basic version of the plant if transformation fails
          return {
            id: plant.id,
            name: plant.name,
            emoji: plant.emoji || '🌱',
            size: plant.size || 1,
            category: plant.category || 'other',
            description: plant.description || '',
            spacing: plant.spacing,
            sunlight: plant.sunlight,
            waterNeeds: plant.water_needs,
            daysToMaturity: plant.days_to_maturity,
            companionPlants: [],
            avoidPlants: [],
            soilTypes: [],
            difficulty: plant.difficulty,
            plantingDepth: plant.planting_depth
          };
        }
      });
      
      console.log('✅ Transformed plants:', transformedPlants);
      setPlants(transformedPlants);
    } catch (err) {
      console.error('❌ Failed to load plant library:', err);
      setError(`Failed to load plant library: ${err.message}`);
      
      // Fallback to a basic plant set if API fails
      const fallbackPlants = [
        {
          id: 'tomato',
          name: 'Tomato',
          emoji: '🍅',
          size: 2,
          category: 'vegetables',
          description: 'Popular garden vegetable',
          companionPlants: ['basil', 'carrot'],
          avoidPlants: ['pepper'],
          soilTypes: ['loamy'],
          difficulty: 'medium'
        },
        {
          id: 'basil',
          name: 'Basil',
          emoji: '🌿',
          size: 1,
          category: 'herbs',
          description: 'Aromatic herb perfect for cooking',
          companionPlants: ['tomato'],
          avoidPlants: [],
          soilTypes: ['loamy'],
          difficulty: 'easy'
        },
        {
          id: 'lettuce',
          name: 'Lettuce',
          emoji: '🥬',
          size: 1,
          category: 'vegetables',
          description: 'Cool-season leafy green',
          companionPlants: ['carrot'],
          avoidPlants: [],
          soilTypes: ['loamy'],
          difficulty: 'easy'
        },
        {
          id: 'carrot',
          name: 'Carrot',
          emoji: '🥕',
          size: 1,
          category: 'vegetables',
          description: 'Root vegetable rich in beta-carotene',
          companionPlants: ['tomato', 'lettuce'],
          avoidPlants: [],
          soilTypes: ['sandy', 'loamy'],
          difficulty: 'easy'
        }
      ];
      
      console.log('📦 Using fallback plants:', fallbackPlants);
      setPlants(fallbackPlants);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPlants = filteredPlants.reduce((acc, plant) => {
    if (!acc[plant.category]) acc[plant.category] = [];
    acc[plant.category].push(plant);
    return acc;
  }, {});

  // Calculate companion and avoid suggestions grouped by source plant
  const companionSuggestionsByPlant = useMemo(() => {
    if (placedPlants.length === 0) return [];

    const placedPlantIds = placedPlants.map(p => p.plantId);
    const suggestions = [];

    placedPlants.forEach(placedPlant => {
      const plantData = plants.find(p => p.id === placedPlant.plantId);
      if (plantData) {
        const companions = [];
        const avoid = [];

        // Get companion plants that aren't already placed
        if (plantData.companionPlants && Array.isArray(plantData.companionPlants)) {
          plantData.companionPlants.forEach(id => {
            if (!placedPlantIds.includes(id)) {
              const companionPlant = plants.find(p => p.id === id);
              if (companionPlant) {
                companions.push(companionPlant);
              }
            }
          });
        }

        // Get avoid plants that aren't already placed
        if (plantData.avoidPlants && Array.isArray(plantData.avoidPlants)) {
          plantData.avoidPlants.forEach(id => {
            if (!placedPlantIds.includes(id)) {
              const avoidPlant = plants.find(p => p.id === id);
              if (avoidPlant) {
                avoid.push(avoidPlant);
              }
            }
          });
        }

        if (companions.length > 0 || avoid.length > 0) {
          suggestions.push({
            sourcePlant: plantData,
            companions: companions.slice(0, 4),
            avoid: avoid.slice(0, 4)
          });
        }
      }
    });

    return suggestions;
  }, [placedPlants, plants]);

  // Add loading and error states
  if (loading) {
    return (
      <div className="fixed lg:relative top-0 left-0 h-screen w-72 sm:w-80 lg:w-64 bg-white border-r border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed lg:relative top-0 left-0 h-screen w-72 sm:w-80 lg:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-sm font-bold">❌</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Plants</h2>
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-red-800 mb-2">Error Loading Plants</h3>
            <p className="text-red-600 text-sm mb-4 px-2">{error}</p>
            <button 
              onClick={loadPlants}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const togglePlantSection = (plantId) => {
    setExpandedPlants(prev => ({
      ...prev,
      [plantId]: !prev[plantId]
    }));
  };

  const totalSuggestions = companionSuggestionsByPlant.reduce((sum, item) => 
    sum + item.companions.length + item.avoid.length, 0
  );

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative 
        top-0 left-0 
        h-screen overflow-auto
        bg-white 
        border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        w-72 sm:w-80 lg:w-64
        z-50 lg:z-auto
        shadow-lg lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-sm font-bold">🌱</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Plants</h2>
            {plants.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                {plants.length}
              </span>
            )}
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            />
          </div>
        </div>

        {/* Companion Plant Guide - Plant-specific suggestions */}
        {placedPlants.length > 0 && (
          <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <button
              onClick={() => setShowCompanionGuide(!showCompanionGuide)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-800">Planting Guide</span>
                {totalSuggestions > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    {totalSuggestions}
                  </span>
                )}
              </div>
              {showCompanionGuide ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showCompanionGuide && companionSuggestionsByPlant.length > 0 && (
              <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto">
                {companionSuggestionsByPlant.map((plantSuggestion) => (
                  <div key={plantSuggestion.sourcePlant.id} className="bg-white/70 rounded-lg p-3 border border-white/50">
                    {/* Source Plant Header */}
                    <button
                      onClick={() => togglePlantSection(plantSuggestion.sourcePlant.id)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{plantSuggestion.sourcePlant.emoji}</span>
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            {plantSuggestion.sourcePlant.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {plantSuggestion.companions.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3 text-green-500" />
                                {plantSuggestion.companions.length} good
                              </span>
                            )}
                            {plantSuggestion.avoid.length > 0 && (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                {plantSuggestion.avoid.length} avoid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {expandedPlants[plantSuggestion.sourcePlant.id] ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* Expanded Suggestions */}
                    {expandedPlants[plantSuggestion.sourcePlant.id] && (
                      <div className="mt-3 space-y-3">
                        {/* Companion Plants */}
                        {plantSuggestion.companions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Heart className="w-3 h-3 text-green-500" />
                              <span className="text-xs font-medium text-green-700">Good Companions</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {plantSuggestion.companions.map((plant) => (
                                <div key={plant.id} className="flex items-center gap-1 p-1.5 bg-green-50/70 rounded text-xs">
                                  <span className="text-sm">{plant.emoji}</span>
                                  <span className="font-medium text-gray-700 truncate">{plant.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Avoid Plants */}
                        {plantSuggestion.avoid.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-medium text-orange-700">Avoid Near This</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {plantSuggestion.avoid.map((plant) => (
                                <div key={plant.id} className="flex items-center gap-1 p-1.5 bg-orange-50/70 rounded text-xs">
                                  <span className="text-sm">{plant.emoji}</span>
                                  <span className="font-medium text-gray-700 truncate">{plant.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick tip */}
                <div className="text-xs text-gray-500 p-2 bg-white/50 rounded">
                  💡 Tap each plant to see its specific companion suggestions
                </div>
              </div>
            )}

            {showCompanionGuide && companionSuggestionsByPlant.length === 0 && (
              <div className="px-4 pb-4">
                <div className="text-xs text-gray-500 p-3 bg-white/50 rounded text-center">
                  Your planted crops don't have companion suggestions yet. Try adding some vegetables or herbs! 🌱
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plant Categories - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(groupedPlants).map(([category, plants]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-2 py-1 bg-gray-100 rounded">
                {category} ({plants.length})
              </h3>
              <div className="space-y-1">
                {plants.map((plant) => (
                  <PlantLibraryItem key={plant.id} plant={plant} />
                ))}
              </div>
            </div>
          ))}
          
          {/* Empty state */}
          {Object.keys(groupedPlants).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm">No plants found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer info (mobile only) */}
        <div className="lg:hidden p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Drag plants to the garden to start planting
          </p>
        </div>
      </div>
    </>
  );
}