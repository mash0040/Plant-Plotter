'use client';
import Link from 'next/link';
import { Leaf, Plus, Edit, Trash2, Eye, MapPin, Ruler } from 'lucide-react';

export default function GardenList({ 
  gardens = [], 
  onEdit, 
  onDelete, 
  onAddNew,
  loading = false,
  error = null 
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Dormant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleDelete = async (garden, e) => {
    e?.stopPropagation();
    onDelete?.(garden);
  };

  const getDescriptionPreview = (garden) => {
    const description = String(garden.description || '').trim();
    return description;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your gardens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 opacity-10">
              <Leaf className="w-32 h-32 text-green-600 transform rotate-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">My Gardens</h1>
              <p className="text-gray-600">Manage and track your garden spaces</p>
            </div>
            <button
              onClick={onAddNew}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Garden
            </button>
          </div>
        </div>

        {gardens && gardens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gardens.map((garden) => (
              <div
                key={garden.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 break-words">
                    {garden.name}
                  </h2>
                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(garden.status)}`}>
                    {garden.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {getDescriptionPreview(garden) && (
                    <p className="line-clamp-2 text-sm leading-6 text-gray-700">
                      {getDescriptionPreview(garden)}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{garden.location}</span>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <Ruler className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {garden.dimensions?.width || garden.width}m × {garden.dimensions?.height || garden.height}m
                    </span>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Soil Type:</span>
                      <span className="text-sm font-medium text-green-700">{garden.soilType || garden.soil_type}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">Plants:</span>
                      <span className="text-sm font-medium text-green-700">{garden.plantCount || garden.plant_count || 0} plants</span>
                    </div>
                  </div>

                  {/* Recent Plants Preview */}
                  {garden.plantedItems && garden.plantedItems.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs text-gray-500 mb-2 block">Recent plants:</span>
                      <div className="flex gap-1 flex-wrap">
                        {garden.plantedItems.slice(0, 6).map((plant, index) => (
                          <span key={index} className="text-lg" title={plant.name}>
                            {plant.emoji}
                          </span>
                        ))}
                        {garden.plantedItems.length > 6 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{garden.plantedItems.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-4 sm:grid-cols-4">
                  <Link
                    href={`/gardens/${garden.id}`}
                    className="min-h-10 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <Link
                    href={`/garden?id=${garden.id}`}
                    className="min-h-10 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    <Leaf className="w-4 h-4" />
                    Plan
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(garden);
                    }}
                    className="min-h-10 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(garden, e)}
                    className="min-h-10 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center justify-center gap-1"
                    aria-label={`Delete ${garden.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sm:hidden lg:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-green-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No gardens yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start your gardening journey by creating your first garden space.
            </p>
            <button
              onClick={onAddNew}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create First Garden
            </button>
          </div>
        )}

        {gardens && gardens.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Garden Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-green-600">{gardens.length}</span>
                </div>
                <div className="text-sm text-gray-600">Total Gardens</div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-blue-600">
                    {gardens.filter(g => g.status === 'Active').length}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-yellow-600">
                    {gardens.filter(g => g.status === 'Planning').length}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Planning</div>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-purple-600">
                    {gardens.reduce((sum, garden) => sum + (garden.plantCount || garden.plant_count || 0), 0)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Total Plants</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
