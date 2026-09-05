'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Save, Leaf } from 'lucide-react';
import RequestErrorNotice from '@/components/RequestErrorNotice';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';
import { getActionErrorMessage } from '@/lib/apiErrors';

const getDefaultFormData = () => ({
  name: '',
  description: '',
  soil_type: 'Loamy', // Changed from soilType to match DB
  width: '',
  height: '',
  location: '',
  status: 'Planning'
});

const getGardenFormData = (gardenData) => ({
  name: gardenData.name || '',
  description: gardenData.description || '',
  soil_type: gardenData.soil_type || gardenData.soilType || 'Loamy', // Handle both formats
  width: (gardenData.width || gardenData.dimensions?.width || '').toString(),
  height: (gardenData.height || gardenData.dimensions?.height || '').toString(),
  location: gardenData.location || '',
  status: gardenData.status || 'Planning'
});

export default function GardenForm({ garden, onSave, onClose, isOpen }) {
  const [unit, setUnit] = useState('metric'); // 'metric' or 'imperial'
  const [formData, setFormData] = useState(getDefaultFormData);

  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [formError, setFormError] = useState('');
  const nameInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const soilTypeInputRef = useRef(null);
  const widthInputRef = useRef(null);
  const heightInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const statusInputRef = useRef(null);
  const formErrorRef = useRef(null);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose,
    canDismiss: !isLoading,
    initialFocusRef: nameInputRef
  });

  // Conversion functions
  const metersToFeet = (meters) => (meters * 3.28084).toFixed(2);
  const feetToMeters = (feet) => (feet / 3.28084);

  // Get unit label
  const getUnitLabel = () => unit === 'metric' ? 'm' : 'ft';
  const getDimensionRange = () => (
    unit === 'metric'
      ? { min: 1, max: 100, unitLabel: 'm' }
      : { min: 3.3, max: 328, unitLabel: 'ft' }
  );

  const getValidationErrors = () => {
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

      const { min, max, unitLabel } = getDimensionRange();

      if (unit === 'metric' && !Number.isInteger(value)) {
        errors[field] = `${label} must be a whole number.`;
        return;
      }

      if (value < min || value > max) {
        errors[field] = `${label} must be between ${min} and ${max} ${unitLabel}.`;
      }
    };

    validateDimension(widthValue, 'width', 'Width');
    validateDimension(heightValue, 'height', 'Height');

    if (location.length > 100) {
      errors.location = 'Location must be 100 characters or fewer.';
    }

    return errors;
  };

  const validateForm = () => {
    const errors = getValidationErrors();
    setValidationErrors(errors);
    return errors;
  };

  const scrollToFirstError = (errors) => {
    const fieldRefs = {
      name: nameInputRef,
      description: descriptionInputRef,
      soil_type: soilTypeInputRef,
      width: widthInputRef,
      height: heightInputRef,
      location: locationInputRef,
      status: statusInputRef
    };
    const errorFieldOrder = ['name', 'description', 'soil_type', 'width', 'height', 'location', 'status'];
    const firstErrorField = errorFieldOrder.find(field => errors[field]);
    const fieldElement = firstErrorField ? fieldRefs[firstErrorField]?.current : null;

    if (!fieldElement) return;

    fieldElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    fieldElement.focus({ preventScroll: true });
  };

  const validateField = (field, value) => {
    if (!['name', 'width', 'height'].includes(field)) return;

    let error = '';

    if (field === 'name') {
      const name = value.trim();

      if (!name) {
        error = 'Garden name is required.';
      } else if (name === '[object Object]' || name === 'undefined' || name === 'null') {
        error = 'Garden name is invalid.';
      } else if (name.length > 50) {
        error = 'Garden name must be 50 characters or fewer.';
      }
    } else {
      const label = field === 'width' ? 'Width' : 'Height';
      const valueText = String(value ?? '');
      const numberValue = Number(valueText);
      const { min, max, unitLabel } = getDimensionRange();

      if (!valueText.trim()) {
        error = `${label} is required.`;
      } else if (!Number.isFinite(numberValue)) {
        error = `${label} must be a valid number.`;
      } else if (unit === 'metric' && !Number.isInteger(numberValue)) {
        error = `${label} must be a whole number.`;
      } else if (numberValue < min || numberValue > max) {
        error = `${label} must be between ${min} and ${max} ${unitLabel}.`;
      }
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  // Handle unit toggle
  const toggleUnit = () => {
    const newUnit = unit === 'metric' ? 'imperial' : 'metric';
    setUnit(newUnit);

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.width;
      delete next.height;
      return next;
    });

    setFormData(prev => {
      if (!prev.width && !prev.height) {
        return prev;
      }

      const convertDimension = (value, converter) => {
        if (!value) return '';
        const parsedValue = parseFloat(value);
        if (!Number.isFinite(parsedValue)) return value;
        return converter(parsedValue);
      };

      if (newUnit === 'imperial') {
        return {
          ...prev,
          width: convertDimension(prev.width, metersToFeet),
          height: convertDimension(prev.height, metersToFeet)
        };
      }

      return {
        ...prev,
        width: convertDimension(prev.width, value => Math.round(feetToMeters(value)).toString()),
        height: convertDimension(prev.height, value => Math.round(feetToMeters(value)).toString())
      };
    });
  };

  // Update form data when garden prop changes
  useEffect(() => {
    if (!isOpen) return;

    setUnit('metric');
    setValidationErrors({});
    setTouchedFields({});
    setFormError('');
    setIsLoading(false);

    if (garden) {
      setFormData(getGardenFormData(garden));
    } else {
      setFormData(getDefaultFormData());
    }
  }, [garden, isOpen]);

  useEffect(() => {
    if (!formError || !formErrorRef.current) return;

    formErrorRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [formError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setTouchedFields({
      name: true,
      description: true,
      width: true,
      height: true,
      location: true,
      soil_type: true,
      status: true
    });

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => scrollToFirstError(errors));
      return;
    }

    setIsLoading(true);
    setFormError('');

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
        requestAnimationFrame(() => scrollToFirstError(apiErrors));
      } else {
        setFormError(getActionErrorMessage(
          error,
          'This garden could not be saved.',
          'Review your changes and try again.'
        ));
      }
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError('');
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

  const dimensionRange = getDimensionRange();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div
        {...dialogProps}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-800">
              {garden ? 'Edit Garden' : 'New Garden'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${garden ? 'edit' : 'new'} garden form`}
            className="touch-target w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
          {formError && (
            <RequestErrorNotice
              noticeRef={formErrorRef}
              message={formError}
              retryLabel={isLoading ? 'Retrying...' : 'Retry save'}
              retryType="submit"
            />
          )}

          {/* Garden Name */}
          <div>
            <label htmlFor="garden-name" className="block text-sm font-medium text-gray-800 mb-2">
              Garden Name *
            </label>
            <input
              id="garden-name"
              ref={nameInputRef}
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
            <label htmlFor="garden-description" className="block text-sm font-medium text-gray-800 mb-2">
              Description
            </label>
            <textarea
              id="garden-description"
              ref={descriptionInputRef}
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
            <label htmlFor="garden-soil-type" className="block text-sm font-medium text-gray-800 mb-2">
              Soil Type
            </label>
            <select
              id="garden-soil-type"
              ref={soilTypeInputRef}
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
            <span className="block text-sm font-medium text-gray-800">
              Dimensions *
            </span>
            <button
              type="button"
              onClick={toggleUnit}
              className="touch-target px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200"
              title={`Switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
              aria-label={`${unit === 'metric' ? 'Metric' : 'Imperial'} dimensions; switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
            >
              {unit === 'metric' ? 'Metric (m)' : 'Imperial (ft)'}
            </button>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="garden-width" className="block text-sm font-medium text-gray-800 mb-2">
                Width ({getUnitLabel()}) *
              </label>
              <input
                id="garden-width"
                ref={widthInputRef}
                type="number"
                value={formData.width}
                onChange={(e) => handleChange('width', e.target.value)}
                onBlur={() => handleBlur('width')}
                placeholder="0"
                min={dimensionRange.min}
                max={dimensionRange.max}
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
              {validationErrors.width && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.width}</p>
              )}
            </div>
            <div>
              <label htmlFor="garden-height" className="block text-sm font-medium text-gray-800 mb-2">
                Height ({getUnitLabel()}) *
              </label>
              <input
                id="garden-height"
                ref={heightInputRef}
                type="number"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                onBlur={() => handleBlur('height')}
                placeholder="0"
                min={dimensionRange.min}
                max={dimensionRange.max}
                step={unit === 'imperial' ? '0.1' : '1'}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-all"
                required
              />
              {validationErrors.height && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.height}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="garden-location" className="block text-sm font-medium text-gray-800 mb-2">
              Location
            </label>
            <input
              id="garden-location"
              ref={locationInputRef}
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
            <label htmlFor="garden-status" className="block text-sm font-medium text-gray-800 mb-2">
              Status
            </label>
            <select
              id="garden-status"
              ref={statusInputRef}
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
                    new Date(garden.createdAt || garden.created_at).toLocaleDateString() : 'Date not recorded'}</p>
                <p>• Last Updated: {garden.updatedAt || garden.updated_at ? 
                    new Date(garden.updatedAt || garden.updated_at).toLocaleDateString() : 'Date not recorded'}</p>
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
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
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
