'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, MapPin, Ruler, Leaf, Eye, BarChart3, Settings, Menu, X, Heart, AlertTriangle } from 'lucide-react';
import { getGardenById } from '@/lib/api';
import { PLANT_LIBRARY } from '@/components/Garden/Constants/PlantData';

export default function GardenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [garden, setGarden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadGarden = async () => {
      try {
        // Try to load from localStorage first (for demo/saved gardens)
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        const localGarden = localGardens.find(g => g.id == params.id);
        
        if (localGarden) {
          setGarden(localGarden);
        } else {
          // Fallback to API mock data
          const gardenData = await getGardenById(params.id);
          setGarden(gardenData);
        }
      } catch (error) {
        console.error('Failed to load garden:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadGarden();
    }
  }, [params.id]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen) {
        const menu = event.target.closest('[data-mobile-menu]');
        const button = event.target.closest('[data-mobile-menu-button]');
        
        if (!menu && !button) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const handleOpenGardenPlanner = () => {
    // Navigate to garden planner with this garden's ID
    router.push(`/garden?id=${garden.id}`);
  };

  const handleEditBasicInfo = () => {
    // Navigate back to gardens page with edit mode for this garden
    router.push(`/gardens?edit=${garden.id}`);
  };

  // Calculate companion plant suggestions based on planted items
  const getCompanionSuggestions = () => {
    if (!garden?.plantedItems || garden.plantedItems.length === 0) {
      return { companions: [], avoid: [] };
    }

    const companionIds = new Set();
    const avoidIds = new Set();
    const plantedPlantIds = garden.plantedItems.map(item => item.plantId);

    garden.plantedItems.forEach(plantedItem => {
      const plantData = PLANT_LIBRARY.find(p => p.id === plantedItem.plantId);
      if (plantData) {
        // Add companion plants that aren't already planted
        plantData.companionPlants?.forEach(id => {
          if (!plantedPlantIds.includes(id)) {
            companionIds.add(id);
          }
        });
        
        // Add avoid plants that aren't already planted
        plantData.avoidPlants?.forEach(id => {
          if (!plantedPlantIds.includes(id)) {
            avoidIds.add(id);
          }
        });
      }
    });

    const companions = Array.from(companionIds)
      .map(id => PLANT_LIBRARY.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 8);

    const avoid = Array.from(avoidIds)
      .map(id => PLANT_LIBRARY.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 6);

    return { companions, avoid };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Garden Not Found</h1>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">The garden you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/gardens')}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 text-sm sm:text-base"
          >
            Back to Gardens
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Dormant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'plants', label: 'Plants', icon: Leaf },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'companion', label: 'Companion', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const companionData = getCompanionSuggestions();

  return (
    <div className="min-h-screen overflow-auto shadow-lg bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-green-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/gardens')}
                className="p-2 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{garden.name}</h1>
                <div className="flex items-center gap-2 sm:gap-4 mt-1">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{garden.location}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(garden.status)}`}>
                    {garden.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={handleEditBasicInfo}
                className="px-3 sm:px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden md:inline">Edit Info</span>
              </button>
              <button
                onClick={handleOpenGardenPlanner}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Garden Planner</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              data-mobile-menu-button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-green-50 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Action Menu */}
          {mobileMenuOpen && (
            <div 
              data-mobile-menu
              className="sm:hidden mt-3 pt-3 border-t border-green-100 space-y-2"
            >
              <button
                onClick={() => {
                  handleEditBasicInfo();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <Edit className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Edit Garden Info</span>
              </button>
              
              <button
                onClick={() => {
                  handleOpenGardenPlanner();
                  setMobileMenuOpen(false);
                }}
                className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <Settings className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Open Garden Planner</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Garden Size</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">
                  {garden.dimensions?.width || garden.width}×{garden.dimensions?.height || garden.height}m
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Ruler className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Total Plants</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800">{garden.plantCount || garden.plantedItems?.length || 0}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Leaf className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Soil Type</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{garden.soilType}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-amber-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <span className="text-lg sm:text-xl">🌱</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm text-gray-600">Created</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">
                  {garden.createdAt ? new Date(garden.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center self-start sm:self-auto">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex min-w-max sm:min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600 bg-green-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Overview</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="text-gray-800 truncate ml-2">{garden.location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="text-gray-800">{garden.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Soil Type:</span>
                            <span className="text-gray-800">{garden.soilType}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Dimensions</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Width:</span>
                            <span className="text-gray-800">{garden.dimensions?.width || garden.width}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Height:</span>
                            <span className="text-gray-800">{garden.dimensions?.height || garden.height}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Area:</span>
                            <span className="text-gray-800">
                              {((garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height)).toFixed(1)}m²
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {garden.plantedItems && garden.plantedItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">Recent Plants Added</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {garden.plantedItems.slice(0, 6).map((plant, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                          <span className="text-2xl flex-shrink-0">{plant.emoji || plant.plantEmoji || '🌱'}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{plant.name || plant.plantName}</p>
                            <p className="text-sm text-gray-600">
                              Planted {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'plants' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">Plants in Garden</h3>
                  <button
                    onClick={handleOpenGardenPlanner}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Leaf className="w-4 h-4" />
                    Add Plants
                  </button>
                </div>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {garden.plantedItems.map((plant, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl flex-shrink-0">{plant.emoji || plant.plantEmoji || '🌱'}</span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-800 truncate">{plant.name || plant.plantName}</h4>
                            <p className="text-sm text-gray-600">Size: {plant.size || plant.plantSize}x{plant.size || plant.plantSize}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Position: ({plant.xPosition || 'N/A'}, {plant.yPosition || 'N/A'})</p>
                          <p>Planted: {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown'}</p>
                          {plant.notes && <p className="truncate">Notes: {plant.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No plants yet</h4>
                    <p className="text-gray-600 mb-6">Start designing your garden by adding some plants.</p>
                    <button
                      onClick={handleOpenGardenPlanner}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Open Garden Planner
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Analytics</h3>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Plant Categories */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Plant Categories</h4>
                      <div className="space-y-3">
                        {(() => {
                          const categories = garden.plantedItems.reduce((acc, plant) => {
                            const category = plant.category || plant.plantCategory || 'Other';
                            acc[category] = (acc[category] || 0) + 1;
                            return acc;
                          }, {});
                          
                          return Object.entries(categories).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                              <span className="text-gray-600 capitalize text-sm">{category}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${(count / garden.plantedItems.length) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-800 w-6 text-right">{count}</span>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Space Utilization */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Space Utilization</h4>
                      <div className="space-y-3">
                        {(() => {
                          const totalArea = (garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height) || 1;
                          const usedSpace = garden.plantedItems.reduce((sum, plant) => sum + ((plant.size || plant.plantSize || 1) * (plant.size || plant.plantSize || 1)), 0);
                          const utilizationPercent = Math.min((usedSpace / totalArea) * 100, 100);
                          
                          return (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600 text-sm">Garden Space Used</span>
                                <span className="text-sm font-medium text-gray-800">
                                  {utilizationPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                                  style={{ width: `${utilizationPercent}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {usedSpace.toFixed(1)}m² used of {totalArea.toFixed(1)}m² total
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Plant Health Overview */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Plant Health Overview</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-lg">🌱</span>
                          </div>
                          <p className="text-xs text-gray-600">Healthy</p>
                          <p className="text-lg font-semibold text-green-600">
                            {Math.floor(garden.plantedItems.length * 0.8)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-lg">⚠️</span>
                          </div>
                          <p className="text-xs text-gray-600">Attention</p>
                          <p className="text-lg font-semibold text-yellow-600">
                            {Math.floor(garden.plantedItems.length * 0.15)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-lg">🚨</span>
                          </div>
                          <p className="text-xs text-gray-600">Critical</p>
                          <p className="text-lg font-semibold text-red-600">
                            {Math.floor(garden.plantedItems.length * 0.05)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Growth Timeline */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <h4 className="font-semibold text-gray-800 mb-4">Planting Timeline</h4>
                      <div className="space-y-3">
                        {garden.plantedItems
                          .sort((a, b) => new Date(b.plantedDate) - new Date(a.plantedDate))
                          .slice(0, 5)
                          .map((plant, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            <span className="text-lg">{plant.emoji || plant.plantEmoji || '🌱'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{plant.name || plant.plantName}</p>
                              <p className="text-xs text-gray-600">
                                {plant.plantedDate ? new Date(plant.plantedDate).toLocaleDateString() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No analytics available</h4>
                    <p className="text-gray-600">Add some plants to see garden analytics and insights.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'companion' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Companion Planting Guide</h3>
                    <p className="text-sm text-gray-600 mt-1">Plants that work well with your current garden</p>
                  </div>
                  <button
                    onClick={handleOpenGardenPlanner}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Heart className="w-4 h-4" />
                    Add Companions
                  </button>
                </div>
                
                {garden.plantedItems && garden.plantedItems.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Good Companions */}
                    {companionData.companions.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Heart className="w-5 h-5 text-green-500" />
                          <h4 className="font-semibold text-gray-800">Good Companion Plants</h4>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            {companionData.companions.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {companionData.companions.map((plant) => (
                            <div key={plant.id} className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
                              <span className="text-xl">{plant.emoji}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{plant.name}</p>
                                <p className="text-xs text-gray-600">{plant.category}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-700">
                            💡 These plants work well with your current crops and can improve growth, pest control, or flavor.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Plants to Avoid */}
                    {companionData.avoid.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          <h4 className="font-semibold text-gray-800">Plants to Avoid</h4>
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                            {companionData.avoid.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {companionData.avoid.map((plant) => (
                            <div key={plant.id} className="bg-orange-50 rounded-lg p-3 flex items-center gap-2">
                              <span className="text-xl">{plant.emoji}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{plant.name}</p>
                                <p className="text-xs text-gray-600">{plant.category}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs text-orange-700">
                            ⚠️ These plants may compete with or inhibit the growth of your current crops.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No companion data */}
                    {companionData.companions.length === 0 && companionData.avoid.length === 0 && (
                      <div className="col-span-2">
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">No companion suggestions available</h4>
                          <p className="text-gray-600 mb-6">Your current plants don't have specific companion recommendations.</p>
                          <button
                            onClick={handleOpenGardenPlanner}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            Add More Plants
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">No plants to analyze</h4>
                    <p className="text-gray-600 mb-6">Add some plants to your garden to see companion planting suggestions.</p>
                    <button
                      onClick={handleOpenGardenPlanner}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Start Planting
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Garden Settings</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Quick Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={handleEditBasicInfo}
                        className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <Edit className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-blue-800">Edit Garden Info</p>
                          <p className="text-sm text-blue-600">Update name, location, soil type, etc.</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleOpenGardenPlanner}
                        className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <Settings className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-green-800">Open Garden Planner</p>
                          <p className="text-sm text-green-600">Design and manage plant layouts</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Garden Information</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-800">
                          {garden.createdAt ? new Date(garden.createdAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="text-gray-800">
                          {garden.updatedAt ? new Date(garden.updatedAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-gray-600">Garden ID:</span>
                        <span className="text-gray-800 font-mono text-xs break-all">{garden.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plant Count:</span>
                        <span className="text-gray-800">{garden.plantedItems?.length || 0} plants</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Garden Area:</span>
                        <span className="text-gray-800">
                          {((garden.dimensions?.width || garden.width) * (garden.dimensions?.height || garden.height)).toFixed(1)}m²
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6">
                  <h4 className="font-semibold text-red-800 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-4">
                    Once you delete a garden, there is no going back. Please be certain.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${garden.name}"? This action cannot be undone.`)) {
                        // Handle garden deletion
                        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
                        const updatedGardens = localGardens.filter(g => g.id != garden.id);
                        localStorage.setItem('gardens', JSON.stringify(updatedGardens));
                        router.push('/gardens');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Delete Garden
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}