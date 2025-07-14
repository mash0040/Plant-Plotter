'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, MapPin, Ruler } from 'lucide-react';

export default function GardenList({ gardens = [], onEdit, onDelete, onView, onAddNew }) {
  const router = useRouter();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-yellow-100 text-yellow-800';
      case 'Dormant': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const handleDelete = (garden) => {
    if (window.confirm(`Delete "${garden.name}"?`)) {
      onDelete?.(garden);
    }
  };

  const handleView = (garden) => {
    // Navigate to garden detail page
    router.push(`/gardens/${garden.id}`);
  };

  const handlePlannerOpen = (garden, e) => {
    e.stopPropagation(); // Prevent card click
    // Navigate to garden planner with garden ID
    router.push(`/garden?id=${garden.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-green-100">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">My Gardens</h1>
              <p className="text-gray-600">Manage and track your garden spaces</p>
            </div>
            <button
              onClick={onAddNew}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Garden
            </button>
          </div>
        </div>

        {gardens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gardens.map((garden) => (
              <div
                key={garden.id}
                onClick={() => handleView(garden)}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">{garden.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(garden.status)}`}>
                    {garden.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{garden.location}</span>
                  </div>

                  <div className="flex items-center gap-3 text-gray-700">
                    <Ruler className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {garden.dimensions?.width}m × {garden.dimensions?.height}m
                    </span>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Soil Type:</span>
                      <span className="text-sm font-medium text-green-700">{garden.soilType}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">Plants:</span>
                      <span className="text-sm font-medium text-green-700">{garden.plantCount || 0} plants</span>
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

                <div className="flex gap-2">
                  <button
                    onClick={(e) => handlePlannerOpen(garden, e)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Plan
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(garden);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(garden);
                    }}
                    className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
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

        {gardens.length > 0 && (
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
                    {gardens.reduce((sum, garden) => sum + (garden.plantCount || 0), 0)}
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