'use client';
import { useState, useEffect } from 'react';
import { X, Save, Leaf } from 'lucide-react';

export default function GardenForm({ garden, onSave, onClose, isOpen }) {
  const [unit, setUnit] = useState('metric'); // 'metric' or 'imperial'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    soil_type: 'Loamy', // Changed from soilType to match DB
    width: '',
    height: '',
    location: '',
    status: 'Planning'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Conversion functions
  const metersToFeet = (meters) => (meters * 3.28084).toFixed(2);
  const feetToMeters = (feet) => (feet / 3.28084);

  // Get unit label
  const getUnitLabel = () => unit === 'metric' ? 'm' : 'ft';

  const validateForm = () => {
    const errors = {};
    const name = formData.name.trim();
    const description = formData.description.trim();
    const location = formData.location.trim();
    const widthValue = Number(formData.width);
    const heightValue = Number(formData.height);

    if (!name) {
      errors.name = 'Garden name is required.';
    } else if (name === '[object Object]' || name === 'undefined' || name === 'null') {
      errors.name = 'Garden name is invalid.';
    } else if (name.length > 50) {
      errors.name = 'Garden name must be 50 characters or fewer.';
    }

    if (description.length > 1000) {
      errors.description = 'Description must be 1000 characters or fewer.';
    }

    const validateDimension = (value, field, label) => {
      if (formData[field] === '') {
        errors[field] = `${label} is required.`;
        return;
      }

      if (!Number.isFinite(value)) {
        errors[field] = `${label} must be a valid number.`;
        return;
      }

      const valueInMeters = unit === 'imperial' ? feetToMeters(value) : value;
      const savedValue = Math.round(valueInMeters);

      if (unit === 'metric' && !Number.isInteger(valueInMeters)) {
        errors[field] = `${label} must be a whole number.`;
        return;
      }

      if (valueInMeters < 1 || valueInMeters > 100) {
        errors[field] = `${label} must be between 1m and 100m.`;
        return;
      }

      if (savedValue < 1 || savedValue > 100) {
        errors[field] = `${label} must save between 1 and 100.`;
      }
    };

    validateDimension(widthValue, 'width', 'Width');
    validateDimension(heightValue, 'height', 'Height');

    if (location.length > 100) {
      errors.location = 'Location must be 100 characters or fewer.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateField = (field, value) => {
    if (field !== 'name') return;

    const name = value.trim();
    let error = '';

    if (!name) {
      error = 'Garden name is required.';
    } else if (name === '[object Object]' || name === 'undefined' || name === 'null') {
      error = 'Garden name is invalid.';
    } else if (name.length > 50) {
      error = 'Garden name must be 50 characters or fewer.';
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) {
        next.name = error;
      } else {
        delete next.name;
      }
      return next;
    });
  };

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
    if (isOpen) {
      if (garden) {
        // Editing existing garden - populate with current data
        const newFormData = {
          name: garden.name || '',
          description: garden.description || '',
          soil_type: garden.soil_type || garden.soilType || 'Loamy', // Handle both formats
          width: (garden.width || garden.dimensions?.width || '').toString(),
          height: (garden.height || garden.dimensions?.height || '').toString(),
          location: garden.location || '',
          status: garden.status || 'Planning'
        };
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
        setFormData({
          name: '',
          description: '',
          soil_type: 'Loamy',
          width: '',
          height: '',
          location: '',
          status: 'Planning'
        });
      }
    }
  }, [garden, isOpen, unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouchedFields({
      name: true,
      description: true,
      width: true,
      height: true,
      location: true,
      soil_type: true,
      status: true
    });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Convert dimensions to meters for storage
      const widthInMeters = unit === 'imperial' ? feetToMeters(parseFloat(formData.width)) : parseFloat(formData.width);
      const heightInMeters = unit === 'imperial' ? feetToMeters(parseFloat(formData.height)) : parseFloat(formData.height);
      const savedWidth = Math.round(widthInMeters);
      const savedHeight = Math.round(heightInMeters);

      // Prepare data to match your database schema
      const gardenData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        width: savedWidth,
        height: savedHeight,
        soil_type: formData.soil_type, // Match DB field name
        location: formData.location.trim() || 'Garden',
        status: formData.status,
        // Include these for frontend compatibility
        dimensions: {
          width: savedWidth,
          height: savedHeight
        },
        soilType: formData.soil_type, // For frontend compatibility
        plantCount: garden?.plantCount || 0,
        plantedItems: garden?.plantedItems || []
      };
      
      await onSave?.(gardenData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error saving garden:', error);
      setIsLoading(false);
      const apiErrors = error?.errors || error?.fieldErrors;
      if (apiErrors && typeof apiErrors === 'object') {
        setValidationErrors(apiErrors);
        setTouchedFields(prev => ({
          ...prev,
          ...Object.keys(apiErrors).reduce((fields, field) => {
            fields[field] = true;
            return fields;
          }, {})
        }));
      } else {
        alert(error.message || 'Failed to save garden. Please try again.');
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field] || '');
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
              Garden Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Enter garden name"
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
              maxLength={50}
            />
            {(touchedFields.name || validationErrors.name) && validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of your garden"
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all resize-none"
              rows={3}
              maxLength={1000}
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
            )}
          </div>

          {/* Soil Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Soil Type
            </label>
            <select
              value={formData.soil_type}
              onChange={(e) => handleChange('soil_type', e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 transition-all"
            >
              <option value="Loamy">Loamy</option>
              <option value="Clay">Clay</option>
              <option value="Sandy">Sandy</option>
              <option value="Silt">Silt</option>
              <option value="Peat">Peat</option>
              <option value="Chalk">Chalk</option>
            </select>
            {validationErrors.soil_type && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.soil_type}</p>
            )}
          </div>

          {/* Unit Toggle */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Dimensions *
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
                Width ({getUnitLabel()}) *
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) => handleChange('width', e.target.value)}
                placeholder="0"
                min="1"
                max="100"
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
              {validationErrors.width && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.width}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height ({getUnitLabel()}) *
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                placeholder="0"
                min="1"
                max="100"
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
              {validationErrors.height && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.height}</p>
              )}
            </div>
          </div>

          {/* Show actual database values */}
          {(formData.width && formData.height) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <span className="text-gray-600">
                Database values: {unit === 'imperial' ? 
                  `${Math.round(feetToMeters(parseFloat(formData.width)))}m × ${Math.round(feetToMeters(parseFloat(formData.height)))}m` :
                  `${Math.round(parseFloat(formData.width))}m × ${Math.round(parseFloat(formData.height))}m`
                }
              </span>
            </div>
          )}

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
              maxLength={100}
            />
            {validationErrors.location && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.location}</p>
            )}
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
            {validationErrors.status && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.status}</p>
            )}
          </div>

          {/* Garden Summary for Edit Mode */}
          {garden && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-sm text-green-800 mb-2">Current Garden Info:</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>• Plants: {garden.plantCount || garden.plant_count || 0} items</p>
                <p>• Created: {garden.createdAt || garden.created_at ? 
                    new Date(garden.createdAt || garden.created_at).toLocaleDateString() : 'Unknown'}</p>
                <p>• Last Updated: {garden.updatedAt || garden.updated_at ? 
                    new Date(garden.updatedAt || garden.updated_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-xl font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.width || !formData.height}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
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
