'use client';
import React, { useRef, useState, useEffect } from 'react';
import { X, Save, Trash2, Edit3, AlertCircle, Plus } from 'lucide-react';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';
import { getUserFacingErrorMessage } from '@/lib/apiErrors';

export default function PlantEditModal({ 
  isOpen, 
  onClose, 
  plant, 
  onSave, 
  onDelete, 
  isPlaced = false 
}) {
  const [formData, setFormData] = useState({
    name: '',
    emoji: '',
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
    plantingDepth: '',
    notes: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companionPlantsText, setCompanionPlantsText] = useState('');
  const [avoidPlantsText, setAvoidPlantsText] = useState('');
  const errorRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const deleteCancelRef = useRef(null);
  const wasDeleteConfirmOpenRef = useRef(false);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose,
    canDismiss: !isSaving
  });

  // Categories available for selection
  const categories = [
    { value: 'vegetables', label: 'Vegetables', emoji: '🥕' },
    { value: 'fruits', label: 'Fruits', emoji: '🍎' },
    { value: 'herbs', label: 'Herbs', emoji: '🌿' },
    { value: 'flowers', label: 'Flowers', emoji: '🌸' },
    { value: 'other', label: 'Other', emoji: '🌱' }
  ];

  // FIXED: Match database enum values exactly
  const sunlightOptions = [
    { value: 'Full Sun', label: 'Full Sun' },
    { value: 'Partial Sun', label: 'Partial Sun' },
    { value: 'Shade', label: 'Shade' }
  ];

  // FIXED: Match database enum values exactly
  const waterNeedsOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'High', label: 'High' }
  ];

  // FIXED: Match database enum values exactly
  const difficultyOptions = [
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' }
  ];

  const soilTypeOptions = [
    { value: 'sandy', label: 'Sandy' },
    { value: 'loamy', label: 'Loamy' },
    { value: 'clay', label: 'Clay' },
    { value: 'silt', label: 'Silt' },
    { value: 'peat', label: 'Peat' },
    { value: 'chalk', label: 'Chalk' }
  ];

  // Check if this is a new plant (no ID or empty name)
  const isNewPlant = !plant?.id || !plant?.name;

  // Load plant data when modal opens
  useEffect(() => {
    if (isOpen && plant) {      
      // Convert arrays to text for display
      const companionText = Array.isArray(plant.companionPlants) ? 
        plant.companionPlants.join(', ') : '';
      const avoidText = Array.isArray(plant.avoidPlants) ? 
        plant.avoidPlants.join(', ') : '';
      
      setFormData({
        name: plant.name || '',
        emoji: plant.emoji || '🌱',
        size: plant.size || 1,
        category: plant.category || 'vegetables',
        description: plant.description || '',
        spacing: plant.spacing || '',
        sunlight: plant.sunlight === 'full' ? 'Full Sun' : 
           plant.sunlight === 'partial' ? 'Partial Sun' :
           plant.sunlight === 'shade' ? 'Shade' :
           plant.sunlight || 'Full Sun',
           
        waterNeeds: plant.waterNeeds === 'low' ? 'Low' :
                  plant.waterNeeds === 'medium' ? 'Moderate' :
                  plant.waterNeeds === 'high' ? 'High' :
                  plant.waterNeeds || 'Moderate',
                  
        difficulty: plant.difficulty === 'easy' ? 'Easy' :
                  plant.difficulty === 'medium' ? 'Medium' :
                  plant.difficulty === 'hard' ? 'Hard' :
                  plant.difficulty || 'Medium',
        daysToMaturity: plant.daysToMaturity || '',
        companionPlants: Array.isArray(plant.companionPlants) ? plant.companionPlants : [],
        avoidPlants: Array.isArray(plant.avoidPlants) ? plant.avoidPlants : [],
        soilTypes: Array.isArray(plant.soilTypes) ? plant.soilTypes : [],
        plantingDepth: plant.plantingDepth || '',
        notes: plant.notes || ''
      });
      
      setCompanionPlantsText(companionText);
      setAvoidPlantsText(avoidText);
      setError('');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, plant]);

  useEffect(() => {
    if (!isOpen) {
      wasDeleteConfirmOpenRef.current = false;
      return undefined;
    }

    if (showDeleteConfirm) {
      wasDeleteConfirmOpenRef.current = true;
      const frameId = requestAnimationFrame(() => deleteCancelRef.current?.focus());
      return () => cancelAnimationFrame(frameId);
    }

    if (wasDeleteConfirmOpenRef.current) {
      wasDeleteConfirmOpenRef.current = false;
      const frameId = requestAnimationFrame(() => deleteButtonRef.current?.focus());
      return () => cancelAnimationFrame(frameId);
    }

    return undefined;
  }, [isOpen, showDeleteConfirm]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // FIXED: Better companion plants handling
  const handleCompanionPlantsChange = (value) => {
    setCompanionPlantsText(value);
    // Convert comma-separated string to array
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      companionPlants: arrayValue
    }));
  };

  // FIXED: Better avoid plants handling
  const handleAvoidPlantsChange = (value) => {
    setAvoidPlantsText(value);
    // Convert comma-separated string to array
    const arrayValue = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      avoidPlants: arrayValue
    }));
  };

  // FIXED: Plant name validation
  const validatePlantName = (name) => {
    if (!name || !name.trim()) {
      return 'Plant name is required';
    }
    
    // Check for valid characters (letters, numbers, spaces, hyphens)
    const validNamePattern = /^[a-zA-Z0-9\s\-']+$/;
    if (!validNamePattern.test(name)) {
      return 'Plant name can only contain letters, numbers, spaces, hyphens, and apostrophes';
    }
    
    if (name.trim().length < 2) {
      return 'Plant name must be at least 2 characters long';
    }
    
    if (name.trim().length > 50) {
      return 'Plant name must be less than 50 characters';
    }
    
    return null;
  };

  // FIXED: Form validation
  const validateForm = () => {
    // Validate plant name
    const nameError = validatePlantName(formData.name);
    if (nameError) {
      setError(nameError);
      return false;
    }

    // Validate required fields
    if (!formData.category) {
      setError('Category is required');
      return false;
    }

    // Validate numeric fields
    if (formData.daysToMaturity && (isNaN(formData.daysToMaturity) || formData.daysToMaturity < 1)) {
      setError('Days to maturity must be a positive number');
      return false;
    }

    if (!formData.size || formData.size < 1 || formData.size > 4) {
      setError('Size must be between 1 and 4');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedPlant = {
        ...plant,
        ...formData,
        // Ensure arrays are properly formatted
        companionPlants: Array.isArray(formData.companionPlants) ? formData.companionPlants : [],
        avoidPlants: Array.isArray(formData.avoidPlants) ? formData.avoidPlants : [],
        soilTypes: Array.isArray(formData.soilTypes) ? formData.soilTypes : []
      };

      await onSave(updatedPlant);
      onClose();
    } catch (error) {
      console.error('Failed to save plant:', error);      
      // Handle specific database errors
      if (error.message.includes('Data truncated')) {
        setError('One of the values is too long for the database. Please shorten your inputs.');
      } else if (error.message.includes('Duplicate entry')) {
        setError('A plant with this name already exists. Please choose a different name.');
      } else {
        setError(getUserFacingErrorMessage(error, 'Failed to save plant'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await onDelete(plant);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete plant:', error);
      setError(getUserFacingErrorMessage(error, 'Failed to delete plant'));
      setShowDeleteConfirm(false);
    }
  };

  // Add click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      style={{ 
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={handleBackdropClick}
    >
      <div
        {...dialogProps}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED: Header shows correct title */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              {isNewPlant ? (
                <Plus className="w-5 h-5 text-green-600" />
              ) : (
                <Edit3 className="w-5 h-5 text-green-600" />
              )}
            </div>
            <h2 id={titleId} className="text-lg sm:text-xl font-bold text-gray-800">
              {isNewPlant ? 'Add New Plant' : (isPlaced ? 'Edit Placed Plant' : 'Edit Plant')}
            </h2>
          </div>
          <button
            onClick={() => {
              onClose();
            }}
            type="button"
            aria-label="Close plant form"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div ref={errorRef} className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">
              {isPlaced ? 'Remove this plant from the garden?' : 'Delete this plant?'}
            </p>
            <p className="text-sm text-red-700 mt-1">
              {isPlaced ? 'This removes the planted item from the current layout.' : 'This action cannot be undone.'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                ref={deleteCancelRef}
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                ref={deleteButtonRef}
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                {isPlaced ? 'Remove' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6" noValidate>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plant-name" className="block text-sm font-medium text-gray-700 mb-2">
                Plant Name *
              </label>
              <input
                id="plant-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Tomato, Basil, Lettuce"
                required
                maxLength="50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use common plant names. Letters, numbers, spaces, and hyphens only.
              </p>
            </div>

            <div>
              <label htmlFor="plant-emoji" className="block text-sm font-medium text-gray-700 mb-2">
                Emoji
              </label>
              <input
                id="plant-emoji"
                type="text"
                value={formData.emoji}
                onChange={(e) => handleInputChange('emoji', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-2xl text-center"
                placeholder="🌱"
                maxLength="2"
              />
            </div>

            <div>
              <label htmlFor="plant-size" className="block text-sm font-medium text-gray-700 mb-2">
                Size (Grid Units)
              </label>
              <select
                id="plant-size"
                value={formData.size}
                onChange={(e) => handleInputChange('size', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={1}>1x1</option>
                <option value={2}>2x2</option>
                <option value={3}>3x3</option>
                <option value={4}>4x4</option>
              </select>
            </div>

            <div>
              <label htmlFor="plant-category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="plant-category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="plant-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="plant-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows="3"
              placeholder="Brief description of the plant..."
              maxLength="500"
            />
          </div>

          {/* Growing Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="plant-sunlight" className="block text-sm font-medium text-gray-700 mb-2">
                Sunlight
              </label>
              <select
                id="plant-sunlight"
                value={formData.sunlight}
                onChange={(e) => handleInputChange('sunlight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {sunlightOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="plant-water-needs" className="block text-sm font-medium text-gray-700 mb-2">
                Water Needs
              </label>
              <select
                id="plant-water-needs"
                value={formData.waterNeeds}
                onChange={(e) => handleInputChange('waterNeeds', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {waterNeedsOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="plant-difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                id="plant-difficulty"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Numerical Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="plant-days-to-maturity" className="block text-sm font-medium text-gray-700 mb-2">
                Days to Maturity
              </label>
              <input
                id="plant-days-to-maturity"
                type="number"
                value={formData.daysToMaturity}
                onChange={(e) => handleInputChange('daysToMaturity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., 65"
                min="1"
                max="365"
              />
            </div>

            <div>
              <label htmlFor="plant-spacing" className="block text-sm font-medium text-gray-700 mb-2">
                Spacing (inches)
              </label>
              <input
                id="plant-spacing"
                type="text"
                value={formData.spacing}
                onChange={(e) => handleInputChange('spacing', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., 12-18"
                maxLength="20"
              />
            </div>

            <div>
              <label htmlFor="plant-depth" className="block text-sm font-medium text-gray-700 mb-2">
                Planting Depth
              </label>
              <input
                id="plant-depth"
                type="text"
                value={formData.plantingDepth}
                onChange={(e) => handleInputChange('plantingDepth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., 1/4 inch"
                maxLength="20"
              />
            </div>
          </div>

          {/* FIXED: Companion and Avoid Plants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plant-companions" className="block text-sm font-medium text-gray-700 mb-2">
                Companion Plants
              </label>
              <input
                id="plant-companions"
                type="text"
                value={companionPlantsText}
                onChange={(e) => handleCompanionPlantsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., tomato, basil, carrot"
                maxLength="200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate plant names with commas. Use common names.
              </p>
            </div>

            <div>
              <label htmlFor="plant-avoid" className="block text-sm font-medium text-gray-700 mb-2">
                Avoid Plants
              </label>
              <input
                id="plant-avoid"
                type="text"
                value={avoidPlantsText}
                onChange={(e) => handleAvoidPlantsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., pepper, walnut"
                maxLength="200"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate plant names with commas. Use common names.
              </p>
            </div>
          </div>

          {/* Soil Types */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Suitable Soil Types
            </legend>
            <div className="flex flex-wrap gap-2">
              {soilTypeOptions.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.soilTypes.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleInputChange('soilTypes', [...formData.soilTypes, option.value]);
                      } else {
                        handleInputChange('soilTypes', formData.soilTypes.filter(type => type !== option.value));
                      }
                    }}
                    className="mr-2 h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Notes (only for placed plants) */}
          {isPlaced && (
            <div>
              <label htmlFor="plant-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="plant-notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows="2"
                placeholder="Personal notes about this plant..."
                maxLength="500"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            {(onDelete && !isPlaced && !isNewPlant) && (
              <button
                ref={deleteButtonRef}
                type="button"
                onClick={handleDelete}
                className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Plant
              </button>
            )}
            {(onDelete && isPlaced) && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove from Garden
              </button>
            )}
          </div>
          
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex min-h-11 items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isNewPlant ? 'Add Plant' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
