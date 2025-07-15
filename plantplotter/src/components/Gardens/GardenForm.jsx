'use client';
import { useState, useEffect } from 'react';
import { X, Save, Leaf } from 'lucide-react';

export default function GardenForm({ garden, onSave, onClose, isOpen }) {
  const [unit, setUnit] = useState('metric'); // 'metric' or 'imperial'
  const [formData, setFormData] = useState({
    name: '',
    soilType: 'Loamy',
    width: '',
    height: '',
    location: '',
    status: 'Planning'
  });

  const [isLoading, setIsLoading] = useState(false);

  // Conversion functions
  const metersToFeet = (meters) => (meters * 3.28084).toFixed(2);
  const feetToMeters = (feet) => (feet / 3.28084);

  // Get unit label
  const getUnitLabel = () => unit === 'metric' ? 'm' : 'ft';

  // Handle unit toggle
  const toggleUnit = () => {
    const newUnit = unit === 'metric' ? 'imperial' : 'metric';
    setUnit(newUnit);
    
    // Convert existing values
    if (formData.width && formData.height) {
      if (newUnit === 'imperial') {
        setFormData(prev => ({
          ...prev,
          width: metersToFeet(parseFloat(prev.width)),
          height: metersToFeet(parseFloat(prev.height))
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          width: feetToMeters(parseFloat(prev.width)).toFixed(1),
          height: feetToMeters(parseFloat(prev.height)).toFixed(1)
        }));
      }
    }
  };

  // Update form data when garden prop changes
  useEffect(() => {
    console.log('GardenForm useEffect - isOpen:', isOpen, 'garden:', garden); // Debug log
    
    if (isOpen) {
      if (garden) {
        // Editing existing garden - populate with current data
        console.log('Populating form with garden data:', garden); // Debug log
        const newFormData = {
          name: garden.name || '',
          soilType: garden.soilType || 'Loamy',
          width: garden.dimensions?.width?.toString() || '',
          height: garden.dimensions?.height?.toString() || '',
          location: garden.location || '',
          status: garden.status || 'Planning'
        };
        console.log('Setting form data:', newFormData); // Debug log
        setFormData(newFormData);
        
        // Convert to current unit if needed
        if (unit === 'imperial' && newFormData.width && newFormData.height) {
          setFormData(prev => ({
            ...prev,
            width: metersToFeet(parseFloat(newFormData.width)),
            height: metersToFeet(parseFloat(newFormData.height))
          }));
        }
      } else {
        // Creating new garden - use default values
        console.log('Setting default form values for new garden'); // Debug log
        setFormData({
          name: '',
          soilType: 'Loamy',
          width: '',
          height: '',
          location: '',
          status: 'Planning'
        });
      }
    }
  }, [garden, isOpen, unit]);

  // Additional effect to ensure form is populated when component renders
  useEffect(() => {
    if (garden && isOpen && (!formData.name && garden.name)) {
      console.log('Fallback: Re-populating form data'); // Debug log
      const newFormData = {
        name: garden.name || '',
        soilType: garden.soilType || 'Loamy',
        width: garden.dimensions?.width?.toString() || '',
        height: garden.dimensions?.height?.toString() || '',
        location: garden.location || '',
        status: garden.status || 'Planning'
      };
      
      // Convert to current unit if needed
      if (unit === 'imperial' && newFormData.width && newFormData.height) {
        newFormData.width = metersToFeet(parseFloat(newFormData.width));
        newFormData.height = metersToFeet(parseFloat(newFormData.height));
      }
      
      setFormData(newFormData);
    }
  }, [garden, isOpen, formData.name, unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Convert dimensions to meters for storage
    const widthInMeters = unit === 'imperial' ? feetToMeters(parseFloat(formData.width)) : parseFloat(formData.width);
    const heightInMeters = unit === 'imperial' ? feetToMeters(parseFloat(formData.height)) : parseFloat(formData.height);

    const gardenData = {
      name: formData.name,
      soilType: formData.soilType,
      dimensions: {
        width: Math.round(widthInMeters * 10) / 10, // Round to 1 decimal place
        height: Math.round(heightInMeters * 10) / 10
      },
      location: formData.location,
      status: formData.status,
      plantCount: garden?.plantCount || 0,
      plantedItems: garden?.plantedItems || []
    };

    setTimeout(() => {
      onSave?.(gardenData);
      setIsLoading(false);
    }, 1000);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              {garden ? 'Edit Garden' : 'New Garden'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Garden Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Garden Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter garden name"
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
              required
            />
          </div>

          {/* Soil Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soil Type
            </label>
            <select
              value={formData.soilType}
              onChange={(e) => handleChange('soilType', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all"
            >
              <option value="Loamy">Loamy</option>
              <option value="Clay">Clay</option>
              <option value="Sandy">Sandy</option>
              <option value="Silt">Silt</option>
              <option value="Peat">Peat</option>
              <option value="Chalk">Chalk</option>
            </select>
          </div>

          {/* Unit Toggle */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Dimensions
            </label>
            <button
              type="button"
              onClick={toggleUnit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200"
              title={`Switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
            >
              {unit === 'metric' ? 'Metric (m)' : 'Imperial (ft)'}
            </button>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Width ({getUnitLabel()})
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="0"
                min="0"
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height ({getUnitLabel()})
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="0"
                min="0"
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Backyard, Front yard, Balcony"
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all"
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Dormant">Dormant</option>
            </select>
          </div>

          {/* Garden Summary for Edit Mode */}
          {garden && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-sm text-green-800 mb-2">Current Garden Info:</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>• Plants: {garden.plantCount || 0} items</p>
                <p>• Created: {garden.createdAt ? new Date(garden.createdAt).toLocaleDateString() : 'Unknown'}</p>
                <p>• Last Updated: {garden.updatedAt ? new Date(garden.updatedAt).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {garden ? 'Update Garden' : 'Create Garden'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}