'use client';
import { Plus, Minus, Grid, Ruler, Save, Sprout, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function ControlPanel({ dimensions, gridSize, showGrid, showRuler, onDimensionChange, onGridSizeChange, onToggleGrid, onToggleRuler, onSave, hasUnsavedChanges, onToggleSidebar, gardenName, onBackClick, backLabel = 'Back to Garden List', saveLabel = 'Save' }) {
  const [unit, setUnit] = useState('metric');
  const [inputValues, setInputValues] = useState({
    width: dimensions.width.toString(),
    height: dimensions.height.toString(),
    zoom: Math.round((gridSize / 40) * 100).toString()
  });

  // Conversion functions
  const metersToFeet = (meters) => (meters * 3.28084).toFixed(2);
  const feetToMeters = (feet) => (feet / 3.28084);
  const gridSizeToZoom = (size) => Math.round((size / 40) * 100);
  const zoomToGridSize = (zoom) => Math.round((zoom / 100) * 40);

  const getUnitLabel = () => unit === 'metric' ? 'm' : 'ft';

  // Handle unit toggle
  const toggleUnit = () => {
    const newUnit = unit === 'metric' ? 'imperial' : 'metric';
    setUnit(newUnit);
    
    // Update input values for display
    if (newUnit === 'imperial') {
      setInputValues({
        width: metersToFeet(dimensions.width),
        height: metersToFeet(dimensions.height),
        zoom: gridSizeToZoom(gridSize).toString()
      });
    } else {
      setInputValues({
        width: dimensions.width.toString(),
        height: dimensions.height.toString(),
        zoom: gridSizeToZoom(gridSize).toString()
      });
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setInputValues(prev => ({ ...prev, [field]: value }));
  };

  // Handle input blur (when user finishes typing)
  const handleInputBlur = (field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    if (field === 'width' || field === 'height') {
      const metersValue = unit === 'imperial' ? feetToMeters(numValue) : numValue;
      const clampedValue = Math.max(1, Math.min(50, Math.round(metersValue)));
      const nextDimensions = {
        ...dimensions,
        [field]: clampedValue
      };
      const dimensionChangeAccepted = onDimensionChange(nextDimensions);
      
      const displayedValue = dimensionChangeAccepted === false ? dimensions[field] : clampedValue;
      setInputValues(prev => ({
        ...prev,
        [field]: unit === 'imperial' ? metersToFeet(displayedValue) : displayedValue.toString()
      }));
    } else if (field === 'zoom') {
      const clampedZoomValue = Math.max(50, Math.min(250, Math.round(numValue)));
      const clampedPixelValue = Math.max(20, Math.min(100, zoomToGridSize(clampedZoomValue)));
      
      onGridSizeChange(clampedPixelValue);
      
      setInputValues(prev => ({
        ...prev,
        zoom: gridSizeToZoom(clampedPixelValue).toString()
      }));
    }
  };

  // Handle +/- buttons
  const adjustDimension = (type, delta) => {
    const newValue = Math.max(1, Math.min(50, dimensions[type] + delta));
    const dimensionChangeAccepted = onDimensionChange({ ...dimensions, [type]: newValue });
    
    if (dimensionChangeAccepted === false) {
      setInputValues(prev => ({
        ...prev,
        [type]: unit === 'imperial' ? metersToFeet(dimensions[type]) : dimensions[type].toString()
      }));
      return;
    }

    setInputValues(prev => ({
      ...prev,
      [type]: unit === 'imperial' ? metersToFeet(newValue) : newValue.toString()
    }));
  };

  const adjustGridSize = (delta) => {
    const newSize = Math.max(20, Math.min(100, gridSize + delta));
    onGridSizeChange(newSize);
    
    setInputValues(prev => ({
      ...prev,
      zoom: gridSizeToZoom(newSize).toString()
    }));
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Top Row - Garden Name and Navigation */}
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Back Button */}
          {onBackClick && (
            <button 
              onClick={onBackClick}
              className="min-h-10 min-w-10 px-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
              title={backLabel}
              aria-label={backLabel}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
              <span className="hidden sm:inline text-sm font-medium text-gray-600 whitespace-nowrap">
                {backLabel}
              </span>
            </button>
          )}
          
          {/* Mobile Plant Library Button */}
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="lg:hidden min-h-10 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 flex items-center gap-2 flex-shrink-0"
              title="Open plant library"
              aria-label="Open plant library"
              data-menu-button
            >
              <Sprout className="w-4 h-4" />
              <span>Plants</span>
            </button>
          )}
          
          {/* Garden Title */}
          <h1 className="min-w-0 flex-1 basis-full text-lg font-semibold text-gray-800 truncate sm:basis-auto sm:text-xl lg:text-2xl">
            {gardenName ? `${gardenName} - Planner` : 'Garden Planner'}
          </h1>
          
          {hasUnsavedChanges && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded whitespace-nowrap flex-shrink-0 ml-2">
              Unsaved
            </span>
          )}
        </div>
      </div>

      {/* Bottom Row - Controls */}
      <div className="px-3 sm:px-4 pb-3 border-t border-gray-100">
        <div className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {/* View Controls Group - Same height as others */}
          <div className="flex items-center justify-between gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200 sm:justify-start">
            <button
              onClick={onToggleGrid}
              className={`min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                showGrid 
                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle grid"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            
            <button
              onClick={onToggleRuler}
              className={`min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                showRuler 
                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Toggle ruler"
            >
              <Ruler className="w-4 h-4" />
              <span className="hidden sm:inline">Ruler</span>
            </button>
            
            <button 
              onClick={onSave}
              className={`min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                hasUnsavedChanges 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Save garden"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{saveLabel}</span>
            </button>
          </div>

          {/* Unit Toggle - Same height */}
          <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={toggleUnit}
              className="min-h-9 w-full px-3 py-2 rounded text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 text-blue-800 sm:w-auto sm:px-2 sm:py-1.5"
              title={`Switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
            >
              {unit === 'metric' ? 'Metric (m)' : 'Imperial (ft)'}
            </button>
          </div>

          {/* Size Controls Group - Same height */}
          <div className="flex flex-col gap-2 bg-white rounded-lg p-2 shadow-sm border border-gray-200 md:flex-row md:items-center md:p-1">
            <span className="text-xs font-medium text-gray-600 hidden md:inline px-1">Size:</span>
            
            {/* Width Controls */}
            <div className="flex items-center gap-1">
              <span className="w-16 text-xs font-medium text-gray-700 md:w-auto md:px-1">Width</span>
              <button 
                onClick={() => adjustDimension('width', -1)} 
                className="min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Decrease width"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={inputValues.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                onBlur={(e) => handleInputBlur('width', e.target.value)}
                aria-label="Garden width"
                className="w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                step={unit === 'imperial' ? '0.1' : '1'}
                min="1"
              />
              <span className="text-xs text-gray-700">{getUnitLabel()}</span>
              <button 
                onClick={() => adjustDimension('width', 1)} 
                className="min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Increase width"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            {/* Height Controls */}
            <div className="flex items-center gap-1">
              <span className="w-16 text-xs font-medium text-gray-700 md:w-auto md:px-1">Height</span>
              <button 
                onClick={() => adjustDimension('height', -1)} 
                className="min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Decrease height"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={inputValues.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                onBlur={(e) => handleInputBlur('height', e.target.value)}
                aria-label="Garden height"
                className="w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                step={unit === 'imperial' ? '0.1' : '1'}
                min="1"
              />
              <span className="text-xs text-gray-700">{getUnitLabel()}</span>
              <button 
                onClick={() => adjustDimension('height', 1)} 
                className="min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Increase height"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Zoom Controls Group - Same height */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <span className="text-xs font-medium text-gray-600 hidden md:inline px-1">Zoom:</span>
            <button 
              onClick={() => adjustGridSize(-5)} 
              className="min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1 hover:bg-gray-100 rounded text-gray-600 flex items-center justify-center"
              title="Zoom out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={inputValues.zoom}
              onChange={(e) => handleInputChange('zoom', e.target.value)}
              onBlur={(e) => handleInputBlur('zoom', e.target.value)}
              className="w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              step="10"
              min="50"
              max="250"
            />
            <span className="text-xs text-gray-500">%</span>
            <button 
              onClick={() => adjustGridSize(5)} 
              className="min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1 hover:bg-gray-100 rounded text-gray-600 flex items-center justify-center"
              title="Zoom in"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
