'use client';
import { Plus, Minus, Grid, Ruler, Save, Sprout, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    setInputValues({
      width: unit === 'imperial' ? metersToFeet(dimensions.width) : dimensions.width.toString(),
      height: unit === 'imperial' ? metersToFeet(dimensions.height) : dimensions.height.toString(),
      zoom: gridSizeToZoom(gridSize).toString()
    });
  }, [dimensions.width, dimensions.height, gridSize, unit]);

  const getDisplayedDimensionValue = (field) => (
    unit === 'imperial' ? metersToFeet(dimensions[field]) : dimensions[field].toString()
  );

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

    if (field === 'width' || field === 'height') {
      if (isNaN(numValue) || numValue <= 0) {
        setInputValues(prev => ({
          ...prev,
          [field]: getDisplayedDimensionValue(field)
        }));
        return;
      }

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
      if (isNaN(numValue) || numValue <= 0) {
        setInputValues(prev => ({
          ...prev,
          zoom: gridSizeToZoom(gridSize).toString()
        }));
        return;
      }

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
              type="button"
              onClick={onBackClick}
              className="touch-target min-h-10 min-w-10 px-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
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
              type="button"
              onClick={onToggleSidebar}
              className="touch-target lg:hidden min-h-10 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 flex items-center gap-2 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
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
              type="button"
              onClick={onToggleGrid}
              className={`touch-target min-h-9 px-3 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center justify-center gap-1 text-xs font-medium transition-colors ${
                showGrid 
                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`}
              title="Toggle grid"
              aria-label="Toggle garden grid"
              aria-pressed={showGrid}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            
            <button
              type="button"
              onClick={onToggleRuler}
              className={`touch-target min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                showRuler 
                  ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-600'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`}
              title="Toggle ruler"
              aria-label="Toggle garden ruler"
              aria-pressed={showRuler}
            >
              <Ruler className="w-4 h-4" />
              <span className="hidden sm:inline">Ruler</span>
            </button>
            
            <button
              type="button"
              onClick={onSave}
              className={`touch-target min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                hasUnsavedChanges 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'hover:bg-gray-100 text-gray-600'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`}
              title="Save garden"
              aria-label="Save garden"
            >
              <Save className="w-4 h-4" />
              <span className="whitespace-nowrap">{saveLabel}</span>
            </button>
          </div>

          {/* Unit Toggle - Same height */}
          <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              type="button"
              onClick={toggleUnit}
              className="touch-target min-h-9 w-full px-3 py-2 rounded text-xs font-medium transition-colors bg-blue-100 hover:bg-blue-200 text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:w-auto sm:px-2 sm:py-1.5"
              title={`Switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
              aria-label={`${unit === 'metric' ? 'Metric' : 'Imperial'} dimensions; switch to ${unit === 'metric' ? 'feet' : 'meters'}`}
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
                type="button"
                onClick={() => adjustDimension('width', -1)}
                className="touch-target min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Decrease width"
                aria-label="Decrease garden width"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={inputValues.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                onBlur={(e) => handleInputBlur('width', e.target.value)}
                aria-label="Garden width"
                className="touch-target w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                step={unit === 'imperial' ? '0.1' : '1'}
                min="1"
              />
              <span className="text-xs text-gray-700">{getUnitLabel()}</span>
              <button
                type="button"
                onClick={() => adjustDimension('width', 1)}
                className="touch-target min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Increase width"
                aria-label="Increase garden width"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            {/* Height Controls */}
            <div className="flex items-center gap-1">
              <span className="w-16 text-xs font-medium text-gray-700 md:w-auto md:px-1">Height</span>
              <button
                type="button"
                onClick={() => adjustDimension('height', -1)}
                className="touch-target min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Decrease height"
                aria-label="Decrease garden height"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={inputValues.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                onBlur={(e) => handleInputBlur('height', e.target.value)}
                aria-label="Garden height"
                className="touch-target w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                step={unit === 'imperial' ? '0.1' : '1'}
                min="1"
              />
              <span className="text-xs text-gray-700">{getUnitLabel()}</span>
              <button
                type="button"
                onClick={() => adjustDimension('height', 1)}
                className="touch-target min-h-9 min-w-9 p-2 hover:bg-gray-100 rounded text-gray-700 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                title="Increase height"
                aria-label="Increase garden height"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Zoom Controls Group - Same height */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <span className="text-xs font-medium text-gray-600 hidden md:inline px-1">Zoom:</span>
            <button
              type="button"
              onClick={() => adjustGridSize(-5)}
              className="touch-target min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1 hover:bg-gray-100 rounded text-gray-600 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              aria-label="Garden zoom percentage"
              value={inputValues.zoom}
              onChange={(e) => handleInputChange('zoom', e.target.value)}
              onBlur={(e) => handleInputBlur('zoom', e.target.value)}
              className="touch-target w-14 sm:w-12 min-h-9 sm:min-h-0 px-1 py-2 sm:py-1 text-xs text-center font-medium text-gray-800 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              step="10"
              min="50"
              max="250"
            />
            <span className="text-xs text-gray-500">%</span>
            <button
              type="button"
              onClick={() => adjustGridSize(5)}
              className="touch-target min-h-9 min-w-9 sm:min-h-0 sm:min-w-0 p-2 sm:p-1 hover:bg-gray-100 rounded text-gray-600 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
