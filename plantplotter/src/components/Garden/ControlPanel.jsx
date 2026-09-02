'use client';
import { Plus, Minus, Grid, Ruler, Save, Sprout, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ControlPanel({
  dimensions,
  gridSize,
  showGrid,
  showRuler,
  onDimensionChange,
  onGridSizeChange,
  onToggleGrid,
  onToggleRuler,
  onSave,
  hasUnsavedChanges,
  onToggleSidebar,
  gardenName,
  onBackClick,
  backLabel = 'Back to Garden List',
  saveLabel = 'Save',
  saveMessage,
  saveError
}) {
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

  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;

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
    <div className="border-b border-green-100 bg-white">
      <div className="bg-green-50/70 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Planner navigation"
              className="flex flex-shrink-0 flex-wrap items-center gap-2"
            >
              {onBackClick && (
                <button
                  type="button"
                  onClick={onBackClick}
                  className="touch-target flex min-h-10 min-w-10 flex-shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                  title={backLabel}
                  aria-label={backLabel}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="hidden whitespace-nowrap sm:inline">{backLabel}</span>
                </button>
              )}

              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  className="touch-target flex min-h-10 flex-shrink-0 items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 lg:hidden"
                  title="Open plant library"
                  aria-label="Open plant library"
                  data-menu-button
                >
                  <Sprout className="h-4 w-4" />
                  <span>Plants</span>
                </button>
              )}
            </div>

            <h1 className="min-w-0 truncate text-lg font-semibold text-gray-900 sm:text-xl lg:text-2xl">
              {gardenName || 'Garden Planner'}
            </h1>
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:min-w-64 lg:items-end">
            <div className="flex w-full items-center justify-between gap-3 lg:justify-end">
              {hasUnsavedChanges && (
                <span role="status" className="flex-shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  Unsaved
                </span>
              )}
              <button
                type="button"
                onClick={onSave}
                className={`touch-target ml-auto flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                  hasUnsavedChanges
                    ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
                    : 'border border-green-200 bg-white text-green-800 hover:bg-green-100'
                }`}
                title="Save garden"
                aria-label="Save garden"
              >
                <Save className="h-4 w-4" />
                <span className="whitespace-nowrap">{saveLabel}</span>
              </button>
            </div>

            {(saveMessage || saveError) && (
              <div
                role={saveError ? 'alert' : 'status'}
                aria-live="polite"
                className={`w-full rounded-md border px-3 py-2 text-sm font-medium ${
                  saveError
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-green-200 bg-green-100 text-green-800'
                }`}
              >
                {saveError || saveMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-green-100 bg-gray-50/80 px-3 py-3 sm:px-4">
        <div className="grid gap-2 text-sm xl:grid-cols-[auto_minmax(0,1fr)]">
          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            <div
              role="group"
              aria-label="View controls"
              className="flex items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:justify-start"
            >
              <button
                type="button"
                onClick={onToggleGrid}
                className={`touch-target flex min-h-9 items-center justify-center gap-1 rounded px-3 py-2 text-xs font-medium transition-colors sm:min-h-0 sm:min-w-0 sm:p-1.5 ${
                  showGrid
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'text-gray-600 hover:bg-gray-100'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`}
                title="Toggle grid"
                aria-label="Toggle garden grid"
                aria-pressed={showGrid}
              >
                <Grid className="h-4 w-4" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={onToggleRuler}
                className={`touch-target flex min-h-9 min-w-9 items-center gap-1 rounded p-2 text-xs transition-colors sm:min-h-0 sm:min-w-0 sm:p-1.5 ${
                  showRuler
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'text-gray-600 hover:bg-gray-100'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2`}
                title="Toggle ruler"
                aria-label="Toggle garden ruler"
                aria-pressed={showRuler}
              >
                <Ruler className="h-4 w-4" />
                <span>Ruler</span>
              </button>
            </div>

            <div
              role="group"
              aria-label="Dimension unit"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1"
            >
              <span className="pl-2 text-xs font-medium text-gray-600">Unit</span>
              <div className="ml-auto grid flex-1 grid-cols-2 rounded-md bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => handleUnitChange('metric')}
                  aria-label="Use metric units"
                  aria-pressed={unit === 'metric'}
                  className={`touch-target min-h-9 rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 sm:min-h-0 ${
                    unit === 'metric'
                      ? 'bg-blue-100 text-blue-800 shadow-sm'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  Metric (m)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange('imperial')}
                  aria-label="Use imperial units"
                  aria-pressed={unit === 'imperial'}
                  className={`touch-target min-h-9 rounded px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 sm:min-h-0 ${
                    unit === 'imperial'
                      ? 'bg-blue-100 text-blue-800 shadow-sm'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  Imperial (ft)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <div
              role="group"
              aria-label="Garden size controls"
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:p-1 xl:flex-row xl:items-center"
            >
              <span className="px-1 text-xs font-semibold text-gray-700">Size</span>

              <div role="group" aria-label="Width controls" className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 xl:flex-1">
                <span className="text-xs font-medium text-gray-700">Width</span>
                <div className="grid grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem] items-center justify-self-end gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDimension('width', -1)}
                    className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                    title="Decrease width"
                    aria-label="Decrease garden width"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    value={inputValues.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    onBlur={(e) => handleInputBlur('width', e.target.value)}
                    aria-label="Garden width"
                    className="touch-target min-h-9 w-14 rounded border border-gray-300 bg-white px-1 py-2 text-center text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:min-h-0 sm:py-1"
                    step={unit === 'imperial' ? '0.1' : '1'}
                    min="1"
                  />
                  <span className="text-center text-xs text-gray-700">{getUnitLabel()}</span>
                  <button
                    type="button"
                    onClick={() => adjustDimension('width', 1)}
                    className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                    title="Increase width"
                    aria-label="Increase garden width"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div role="group" aria-label="Height controls" className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 xl:flex-1">
                <span className="text-xs font-medium text-gray-700">Height</span>
                <div className="grid grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem] items-center justify-self-end gap-1">
                  <button
                    type="button"
                    onClick={() => adjustDimension('height', -1)}
                    className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                    title="Decrease height"
                    aria-label="Decrease garden height"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    value={inputValues.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    onBlur={(e) => handleInputBlur('height', e.target.value)}
                    aria-label="Garden height"
                    className="touch-target min-h-9 w-14 rounded border border-gray-300 bg-white px-1 py-2 text-center text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:min-h-0 sm:py-1"
                    step={unit === 'imperial' ? '0.1' : '1'}
                    min="1"
                  />
                  <span className="text-center text-xs text-gray-700">{getUnitLabel()}</span>
                  <button
                    type="button"
                    onClick={() => adjustDimension('height', 1)}
                    className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                    title="Increase height"
                    aria-label="Increase garden height"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div
              role="group"
              aria-label="Zoom controls"
              className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:p-1 md:w-auto"
            >
              <span className="text-xs font-semibold text-gray-700">Zoom</span>
              <div className="grid grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem] items-center justify-self-end gap-1">
                <button
                  type="button"
                  onClick={() => adjustGridSize(-5)}
                  className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  aria-label="Garden zoom percentage"
                  value={inputValues.zoom}
                  onChange={(e) => handleInputChange('zoom', e.target.value)}
                  onBlur={(e) => handleInputBlur('zoom', e.target.value)}
                  className="touch-target min-h-9 w-14 rounded border border-gray-300 bg-white px-1 py-2 text-center text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:min-h-0 sm:py-1"
                  step="10"
                  min="50"
                  max="250"
                />
                <span className="text-center text-xs text-gray-500">%</span>
                <button
                  type="button"
                  onClick={() => adjustGridSize(5)}
                  className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 sm:min-h-0 sm:min-w-0 sm:p-1"
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
