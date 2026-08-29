'use client';
import { ArrowLeft, X, Search, ChevronDown, ChevronUp, Heart, AlertTriangle, Info, Plus } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import PlantLibraryItem from './PlantLibraryItem';
import apiClient from '@/lib/api';
import { getUserFacingErrorMessage } from '@/lib/apiErrors';
import { useAuth } from '@/hooks/useAuth';
import useBodyScrollLock from '@/hooks/useBodyScrollLock';

export default function PlantLibrary({ 
  searchTerm, 
  setSearchTerm, 
  isOpen, 
  onToggle,
  placedPlants = [],
  onPlantsLoaded, 
  onEditPlant,
  onPlantRow,  // Add this new prop
  disableDrag = false
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showCompanionGuide, setShowCompanionGuide] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});
  const [selectedInfoPlant, setSelectedInfoPlant] = useState(null);

  // Helper function to safely parse JSON or comma-separated strings
  const safeJsonParse = (value, fallback = []) => {
    if (!value) return fallback;
    
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (jsonError) {
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

  const findPlantMatches = (searchValue, plantsArray) => {
    if (!searchValue || !plantsArray) return [];
    
    const searchLower = searchValue.toLowerCase();
    return plantsArray.filter(plant => {
      return (
        plant.id?.toLowerCase() === searchLower ||
        plant.name?.toLowerCase() === searchLower ||
        plant.name?.toLowerCase().includes(searchLower) ||
        plant.id?.toLowerCase().includes(searchLower)
      );
    });
  };

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const plantLibrary = await apiClient.getPlantLibrary();
      
      if (!Array.isArray(plantLibrary)) {
        throw new Error('Plant library response is not an array');
      }
      
      const transformedPlants = plantLibrary.map((plant, index) => {
        try {
          const companionPlants = safeJsonParse(plant.companion_plants, []);
          const avoidPlants = safeJsonParse(plant.avoid_plants, []);
          const soilTypes = safeJsonParse(plant.soil_types, []);
                    
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
          console.error(`Failed to transform plant ${plant.name}:`, plantError);
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
      
      setPlants(transformedPlants);
      
      return transformedPlants;
      
    } catch (err) {
      console.error('Failed to load plant library:', err);
      setError(getUserFacingErrorMessage(err, 'Failed to load plant library.'));
      
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
      
      setPlants(fallbackPlants);
      
      return fallbackPlants;
    } finally {
      setLoading(false);
    }
  };

  const refreshPlants = useCallback(async () => {
    const refreshedPlants = await loadPlants();
    return refreshedPlants;
  }, []);

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    if (onPlantsLoaded && plants.length > 0) {
      onPlantsLoaded(plants, refreshPlants);
    }
  }, [plants.length, onPlantsLoaded, refreshPlants]);

  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPlants = filteredPlants.reduce((acc, plant) => {
    if (!acc[plant.category]) acc[plant.category] = [];
    acc[plant.category].push(plant);
    return acc;
  }, {});

  const companionSuggestionsByPlant = useMemo(() => {
    if (placedPlants.length === 0 || plants.length === 0) return [];
    
    const uniquePlantedTypes = [];
    const seenPlantTypes = new Set();
    
    placedPlants.forEach(placedPlant => {
      const plantKey = (placedPlant.plantId || placedPlant.name || '').toLowerCase();
      if (!seenPlantTypes.has(plantKey)) {
        seenPlantTypes.add(plantKey);
        uniquePlantedTypes.push(placedPlant);
      }
    });

    const suggestions = [];

    uniquePlantedTypes.forEach(placedPlant => {      
      let plantData = plants.find(p => p.id === placedPlant.plantId);
      
      if (!plantData) {
        plantData = plants.find(p => 
          p.name?.toLowerCase() === placedPlant.name?.toLowerCase()
        );
        
        if (!plantData) {
          plantData = plants.find(p => 
            p.name?.toLowerCase().includes(placedPlant.name?.toLowerCase()) ||
            placedPlant.name?.toLowerCase().includes(p.name?.toLowerCase())
          );
        }
      }

      if (plantData) {
        const companions = [];
        const avoid = [];

        if (plantData.companionPlants && Array.isArray(plantData.companionPlants)) {
          plantData.companionPlants.forEach(companionRef => {
            
            const alreadyPlaced = placedPlants.some(placed => 
              placed.plantId === companionRef || 
              placed.name?.toLowerCase() === companionRef.toLowerCase() ||
              placed.plantId?.toLowerCase() === companionRef.toLowerCase()
            );

            if (!alreadyPlaced) {
              const companionMatches = findPlantMatches(companionRef, plants);
              
              if (companionMatches.length > 0) {
                const companionPlant = companionMatches[0];
                
                const alreadyInCompanions = companions.some(existing => 
                  existing.id === companionPlant.id || 
                  existing.name?.toLowerCase() === companionPlant.name?.toLowerCase()
                );
                
                if (!alreadyInCompanions) {
                  companions.push(companionPlant);
                }
              } else {
                const placeholderPlant = {
                  id: companionRef,
                  name: companionRef.charAt(0).toUpperCase() + companionRef.slice(1),
                  emoji: '🌱',
                  category: 'unknown',
                  description: 'Beneficial companion plant'
                };
                
                const alreadyInCompanions = companions.some(existing => 
                  existing.id === placeholderPlant.id || 
                  existing.name?.toLowerCase() === placeholderPlant.name?.toLowerCase()
                );
                
                if (!alreadyInCompanions) {
                  companions.push(placeholderPlant);
                }
              }
            }
          });
        }

        if (plantData.avoidPlants && Array.isArray(plantData.avoidPlants)) {
          plantData.avoidPlants.forEach(avoidRef => {           
            const alreadyPlaced = placedPlants.some(placed => 
              placed.plantId === avoidRef || 
              placed.name?.toLowerCase() === avoidRef.toLowerCase() ||
              placed.plantId?.toLowerCase() === avoidRef.toLowerCase()
            );

            if (alreadyPlaced) {
              const avoidMatches = findPlantMatches(avoidRef, plants);
              if (avoidMatches.length > 0) {
                const avoidPlant = avoidMatches[0];
                
                const alreadyInAvoid = avoid.some(existing => 
                  existing.id === avoidPlant.id || 
                  existing.name?.toLowerCase() === avoidPlant.name?.toLowerCase()
                );
                
                if (!alreadyInAvoid) {
                  avoid.push(avoidPlant);
                }
              }
            } else {
              const avoidMatches = findPlantMatches(avoidRef, plants);
              if (avoidMatches.length > 0) {
                const avoidPlant = avoidMatches[0];
                
                const alreadyInAvoid = avoid.some(existing => 
                  existing.id === avoidPlant.id || 
                  existing.name?.toLowerCase() === avoidPlant.name?.toLowerCase()
                );
                
                if (!alreadyInAvoid) {
                  avoid.push(avoidPlant);
                }
              }
            }
          });
        }

        if (companions.length > 0 || avoid.length > 0) {
          suggestions.push({
            sourcePlant: plantData,
            placedPlant: placedPlant,
            companions: companions.slice(0, 4),
            avoid: avoid.slice(0, 4)
          });
        }
      }
    });

    return suggestions;
  }, [placedPlants, plants]);

  // Plant editing functions
  const handleEditPlant = (plant) => {
    if (!isAdmin) {
      return;
    }

    if (onEditPlant) {
      onEditPlant(plant);
    } else {
      console.error('onEditPlant callback not provided to PlantLibrary');
    }
  };

  // Row planting function
  const handlePlantRow = (plant) => {
    if (onPlantRow) {
      onPlantRow(plant);
    } else {
      console.error('onPlantRow callback not provided to PlantLibrary');
    }
  };

  const formatPlantValue = (value) => {
    if (value === undefined || value === null || value === '') return 'Not specified.';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not specified.';
    if (typeof value === 'object') return 'Not specified.';
    return String(value);
  };

  const formatPlantList = (value) => {
    const list = safeJsonParse(value, []);
    return list
      .map(item => String(item).replace(/_/g, ' ').trim())
      .filter(Boolean)
      .map(item => item.charAt(0).toUpperCase() + item.slice(1));
  };

  const getPlantInfoRows = (plant) => ([
    ['Category', plant.category || plant.type],
    ['Garden footprint', plant.size ? `${plant.size}x${plant.size} grid units` : 'Not specified.'],
    ['Sunlight', plant.sunlight],
    ['Water needs', plant.waterNeeds || plant.water_needs],
    ['Spacing', plant.spacing],
    ['Planting depth', plant.plantingDepth || plant.planting_depth],
    ['Difficulty', plant.difficulty],
    ['Days to maturity', plant.daysToMaturity || plant.days_to_maturity]
  ]);

  const PlantInfoModal = ({ plant, onClose }) => {
    useBodyScrollLock(Boolean(plant));

    if (!plant) return null;

    const companions = formatPlantList(plant.companionPlants || plant.companion_plants);
    const avoidPlants = formatPlantList(plant.avoidPlants || plant.avoid_plants);

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
        <div className="w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-gray-100">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl flex-shrink-0">{plant.emoji || 'Plant'}</span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{plant.name}</h2>
                <p className="text-sm text-gray-700 capitalize">{formatPlantValue(plant.category || plant.type)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close plant details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getPlantInfoRows(plant).map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{label}</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{formatPlantValue(value)}</p>
                </div>
              ))}
            </div>

            {plant.description && (
              <div className="rounded-lg border border-gray-100 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Description</h3>
                <p className="text-sm leading-6 text-gray-700">{formatPlantValue(plant.description)}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-green-800">Good companions</h3>
                </div>
                <p className="text-sm text-green-800">{companions.length > 0 ? companions.join(', ') : 'Not specified.'}</p>
              </div>

              <div className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-semibold text-orange-800">Avoid near</h3>
                </div>
                <p className="text-sm text-orange-800">{avoidPlants.length > 0 ? avoidPlants.join(', ') : 'Not specified.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleAddNewPlant = () => {
    if (!isAdmin) {
      return;
    }

    const newPlantTemplate = {
      name: '',
      emoji: '🌱',
      size: 1,
      category: 'vegetables',
      description: '',
      spacing: '',
      sunlight: 'Full Sun',
      waterNeeds: 'Moderate',
      daysToMaturity: '',
      companionPlants: [],
      avoidPlants: [],
      soilTypes: [],
      difficulty: 'Medium',
      plantingDepth: ''
    };
    
    if (onEditPlant) {
      onEditPlant(newPlantTemplate);
    } else {
      console.error('onEditPlant callback not provided to PlantLibrary');
    }
  };

  if (loading) {
    return (
      <div className="fixed lg:relative top-0 left-0 h-screen w-[85vw] max-w-80 lg:w-64 lg:max-w-none bg-white text-gray-900 border-r border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading plants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed lg:relative top-0 left-0 h-screen w-[85vw] max-w-80 lg:w-64 lg:max-w-none bg-white text-gray-900 border-r border-gray-200 flex flex-col">
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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      <div className={`
        fixed lg:relative 
        top-0 left-0 
        h-screen overflow-hidden
        bg-white text-gray-900
        border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        w-[85vw] max-w-80 lg:w-64 lg:max-w-none
        z-50 lg:z-auto
        shadow-lg lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={handleAddNewPlant}
                className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                title="Add new plant"
              >
                <Plus className="w-4 h-4 text-green-600" />
              </button>
            )}
            <button 
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800 lg:hidden">
            Use Plant in Row to add plants.
          </p>
        </div>

        {placedPlants.length > 0 && (
          <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
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

            {showCompanionGuide && (
              <div className="px-4 pb-4">
                {companionSuggestionsByPlant.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {companionSuggestionsByPlant.map((plantSuggestion) => (
                      <div key={plantSuggestion.sourcePlant.id} className="bg-white/70 rounded-lg p-3 border border-white/50">
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

                        {expandedPlants[plantSuggestion.sourcePlant.id] && (
                          <div className="mt-3 space-y-3">
                            {plantSuggestion.companions.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 mb-2">
                                  <Heart className="w-3 h-3 text-green-500" />
                                  <span className="text-xs font-medium text-green-700">Good Companions</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  {plantSuggestion.companions.map((plant, idx) => (
                                    <div key={`${plant.id}-${idx}`} className="flex items-center gap-1 p-1.5 bg-green-50/70 rounded text-xs">
                                      <span className="text-sm">{plant.emoji}</span>
                                      <span className="font-medium text-gray-700 truncate">{plant.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {plantSuggestion.avoid.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1 mb-2">
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  <span className="text-xs font-medium text-orange-700">Avoid Near This</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  {plantSuggestion.avoid.map((plant, idx) => (
                                    <div key={`${plant.id}-${idx}`} className="flex items-center gap-1 p-1.5 bg-orange-50/70 rounded text-xs">
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

                    <div className="text-xs text-gray-500 p-2 bg-white/50 rounded">
                      💡 Tap each plant to see its specific companion suggestions
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 p-3 bg-white/50 rounded text-center">
                    No companion data found for your plants. This could mean:
                    <ul className="mt-2 text-left">
                      <li>• Plant IDs don't match library entries</li>
                      <li>• Plants don't have companion data</li>
                      <li>• All companions are already planted</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain'
          }}
          data-scroll-container="plants"
        >
          {Object.entries(groupedPlants).map(([category, plants]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-2 py-1 bg-gray-100 rounded sticky top-0 z-10">
                {category} ({plants.length})
              </h3>
              <div className="space-y-1">
                {plants.map((plant) => (
                  <PlantLibraryItem 
                    key={plant.id} 
                    plant={plant}
                    onEdit={handleEditPlant}
                    onPlantRow={handlePlantRow}
                    onInfo={setSelectedInfoPlant}
                    showEditButton={isAdmin}
                    isInScrollContainer={true}
                    disableDrag={disableDrag}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedPlants).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm">No plants found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}
          
          <div className="h-20"></div>
        </div>

        <div className="lg:hidden p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-xs font-medium text-gray-700 text-center">
            Use Plant in Row for reliable mobile planting.
          </p>
        </div>
      </div>

      <PlantInfoModal
        plant={selectedInfoPlant}
        onClose={() => setSelectedInfoPlant(null)}
      />
    </>
  );
}
