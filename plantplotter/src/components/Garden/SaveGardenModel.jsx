'use client';
import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import apiClient from '@/lib/api';

export default function SaveGardenModel({ isOpen, onClose, onSave, currentGarden, onNavigateToGardens }) {
  const FIELD_LIMITS = {
    name: 50, 
    description: 1000,  
    location: 100,
    soilType: 50,
    status: 30 
  };

  const getInitialGardenName = () => {
    if (!currentGarden?.name) return '';
    
    if (typeof currentGarden.name === 'string') {
      return currentGarden.name;
    } else if (typeof currentGarden.name === 'object' && currentGarden.name !== null) {
      console.warn('⚠️ Garden name is an object, extracting string:', currentGarden.name);
      return currentGarden.name.name || currentGarden.name.value || String(currentGarden.name);
    } else {
      return String(currentGarden.name || '');
    }
  };
  
  const [gardenName, setGardenName] = useState(getInitialGardenName());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  
  // Update gardenName when currentGarden changes
  useEffect(() => {
    if (isOpen) {
      const name = getInitialGardenName();
      setGardenName(name);
      setError(null);
      setWarnings([]);
    }
  }, [isOpen, currentGarden]);

  // Real-time validation as user types
  const validateAndWarn = (name) => {
    const newWarnings = [];
    
    if (name.length > FIELD_LIMITS.name) {
      newWarnings.push({
        type: 'length',
        message: `Garden name is ${name.length} characters. Maximum allowed is ${FIELD_LIMITS.name}. Extra characters will be removed.`,
        preview: `Will be saved as: "${name.substring(0, FIELD_LIMITS.name)}"`
      });
    }
    
    // Check for objects or weird data
    if (typeof name !== 'string') {
      newWarnings.push({
        type: 'type',
        message: 'Garden name should be text only.',
        preview: `Detected type: ${typeof name}`
      });
    }
    
    setWarnings(newWarnings);
  };

  // Smart truncation at word boundary
  const smartTruncate = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    
    // Find last space before the limit
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { 
      return truncated.substring(0, lastSpace) + '...';
    } else {
      return truncated + '...';
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setGardenName(value);
    validateAndWarn(value);
    
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Helper function to format plant date safely
  const formatPlantDate = (dateValue) => {
    if (!dateValue) {
      return new Date().toISOString().split('T')[0];
    }
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    if (typeof dateValue === 'string') {
      // Handle both full ISO strings and date-only strings
      return dateValue.split('T')[0];
    }
    
    // Fallback to today
    return new Date().toISOString().split('T')[0];
  };

  const handleSave = async () => {
    try {
      let cleanName;

      if (typeof gardenName === 'string') {
        cleanName = gardenName.trim();
      } else {
        setError('Garden name must be text.');
        return;
      }

      if (!cleanName || cleanName.length === 0) {
        setError('Garden name is required.');
        return;
      }

      if (cleanName === '[object Object]' || cleanName === 'undefined' || cleanName === 'null') {
        setError('Garden name is invalid.');
        return;
      }

      if (cleanName.length > 50) {
        setError('Garden name must be 50 characters or fewer.');
        return;
      }
      
      setSaving(true);
      setError(null);
      
      // Create garden data with GUARANTEED string values
      const gardenData = {
        name: cleanName, 
        description: String(currentGarden?.description || '').substring(0, 1000),
        width: currentGarden?.dimensions?.width || currentGarden?.width || 10,
        height: currentGarden?.dimensions?.height || currentGarden?.height || 8,
        soil_type: String(currentGarden?.soilType || 'Loamy').substring(0, 50),
        location: String(currentGarden?.location || 'Garden').substring(0, 100),
        status: String(currentGarden?.status || 'Active').substring(0, 30)
      };

      // Add ID if updating existing garden
      if (currentGarden?.id) {
        gardenData.id = currentGarden.id;
      }

      // Additional validation before sending
      Object.keys(gardenData).forEach(key => {
        if (typeof gardenData[key] === 'object' && gardenData[key] !== null && key !== 'id') {
          console.error(`CRITICAL: ${key} is still an object!`, gardenData[key]);
          throw new Error(`Data validation failed: ${key} is an object`);
        }
      });

      // Continue with existing planted items logic...
      const plantedItems = (currentGarden?.plantedItems || []).map(plant => {
        const cleanPlant = {
          plant_id: String(plant.plantId || plant.id?.replace('plant-', '') || 'unknown').substring(0, 100),
          plant_name: String(plant.name || 'Unknown Plant').substring(0, 255),
          plant_emoji: String(plant.emoji || '🌱').substring(0, 10),
          plant_size: Math.max(1, parseInt(plant.size) || 1),
          plant_category: String(plant.category || 'other').substring(0, 100),
          x_position: Math.max(0, Math.floor((plant.x || 0) / 40)),
          y_position: Math.max(0, Math.floor((plant.y || 0) / 40)),
          planted_date: formatPlantDate(plant.plantedDate),
          notes: String(plant.notes || '').substring(0, 1000)
        };
        
        return cleanPlant;
      });

      // Save with clean data
      const savedGarden = await apiClient.saveCompleteGarden(gardenData, plantedItems);
      
      
      // Transform response back to component format
      const transformedGarden = {
        id: savedGarden.id,
        name: savedGarden.name, // Use the name from database
        description: savedGarden.description || '',
        dimensions: {
          width: savedGarden.width || savedGarden.dimensions?.width,
          height: savedGarden.height || savedGarden.dimensions?.height
        },
        soilType: savedGarden.soil_type || savedGarden.soilType,
        location: savedGarden.location,
        status: savedGarden.status,
        plantCount: plantedItems.length,
        plantedItems: currentGarden?.plantedItems || [],
        createdAt: savedGarden.created_at || savedGarden.createdAt,
        updatedAt: savedGarden.updated_at || savedGarden.updatedAt
      };
      
      // Update the local state to match what was actually saved
      setGardenName(savedGarden.name);
      
      // Call the success handlers
      if (onSave) {
        onSave(transformedGarden);
      }
      
      // Close modal
      onClose();
      
      // Don't automatically navigate - let user stay on the current page
      // Navigation can be triggered manually if needed
      
    } catch (error) {
      console.error('Save failed:', error);
      setError(error.message || 'Failed to save garden. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && gardenName.trim() && !saving && warnings.length === 0) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const hasLengthWarning = warnings.some(w => w.type === 'length');
  const remainingChars = FIELD_LIMITS.name - gardenName.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {currentGarden?.id ? 'Update Garden' : 'Save Garden'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Warning Display */}
        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 font-medium text-sm">Length Warning</span>
            </div>
            {warnings.map((warning, idx) => (
              <div key={idx} className="text-yellow-700 text-sm">
                <p>{warning.message}</p>
                {warning.preview && (
                  <p className="mt-1 font-mono text-xs bg-yellow-200 p-1 rounded">
                    {warning.preview}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Garden Name *
          </label>
          <input
            type="text"
            value={gardenName}
            onChange={handleNameChange}
            onKeyPress={handleKeyPress}
            placeholder="My Vegetable Garden"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none ${
              hasLengthWarning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
            }`}
            disabled={saving}
            autoFocus
          />
          
          {/* Character Counter */}
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${
              remainingChars < 0 ? 'text-red-500' : 
              remainingChars < 10 ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {remainingChars < 0 ? 
                `${Math.abs(remainingChars)} characters over limit` :
                `${remainingChars} characters remaining`
              }
            </span>
            <span className="text-xs text-gray-400">
              {gardenName.length}/{FIELD_LIMITS.name}
            </span>
          </div>
        </div>

        {/* Garden Summary */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Garden Summary:</h4>
          <p className="text-sm text-gray-600">
            • Dimensions: {currentGarden?.width || currentGarden?.dimensions?.width || 20}×{currentGarden?.height || currentGarden?.dimensions?.height || 12} units
          </p>
          <p className="text-sm text-gray-600">
            • Plants: {currentGarden?.plantedItems?.length || 0} items
          </p>
          <p className="text-sm text-gray-600">
            • Grid Size: {currentGarden?.gridSize || 40}px
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!gardenName.trim() || saving || warnings.length > 0}
            className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              hasLengthWarning ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {hasLengthWarning ? 'Save (Truncated)' : (currentGarden?.id ? 'Update Garden' : 'Save Garden')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
