// Note: The handleBackToGarden function should be updated in the parent component
// to navigate to '/gardens' instead of '/gardens/{id}''use client';
import { Plus, Minus, Grid, Ruler, Save, FolderOpen, Menu, ArrowLeft } from 'lucide-react';

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
  onBackClick
}) {
  const adjustDimension = (type, delta) => {
    const newValue = Math.max(1, Math.min(50, dimensions[type] + delta));
    onDimensionChange({ ...dimensions, [type]: newValue });
  };

  const adjustGridSize = (delta) => {
    const newSize = Math.max(20, Math.min(100, gridSize + delta));
    onGridSizeChange(newSize);
  };

  // Convert pixels to meters (assuming 40px = 1m as default scale)
  const pixelsToMeters = (pixels) => {
    return (pixels / 40).toFixed(1);
  };

  // Grid size options in meters
  const getGridSizeInMeters = () => {
    return pixelsToMeters(gridSize);
  };

  // Grid size label with both meters and feet
  const getGridSizeLabel = () => {
    const meters = parseFloat(getGridSizeInMeters());
    const feet = (meters * 3.28084).toFixed(1);
    return `${meters}m / ${feet}ft`;
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Top Row - Garden Name and Navigation */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {/* Back Button */}
          {onBackClick && (
            <button 
              onClick={onBackClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Back to gardens list"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          {/* Mobile Menu Button */}
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Toggle plant library"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          {/* Garden Title */}
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 truncate">
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
        <div className="flex items-center justify-start gap-2 sm:gap-3 text-sm flex-wrap">
          {/* View Controls Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={onToggleGrid}
              className={`p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
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
              className={`p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
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
              className={`p-1.5 rounded flex items-center gap-1 text-xs transition-colors ${
                hasUnsavedChanges 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Save garden"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>

          {/* Size Controls Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 shadow-sm border border-gray-200">
            <span className="text-xs font-medium text-gray-600 hidden md:inline px-1">Size:</span>
            
            {/* Width Controls */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => adjustDimension('width', -1)} 
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Decrease width"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs min-w-6 text-center font-medium text-gray-800">
                {dimensions.width}
              </span>
              <button 
                onClick={() => adjustDimension('width', 1)} 
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Increase width"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            
            <span className="text-xs text-gray-400">×</span>
            
            {/* Height Controls */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => adjustDimension('height', -1)} 
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Decrease height"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs min-w-6 text-center font-medium text-gray-800">
                {dimensions.height}
              </span>
              <button 
                onClick={() => adjustDimension('height', 1)} 
                className="p-1 hover:bg-gray-100 rounded text-gray-600"
                title="Increase height"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grid Size Controls Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 shadow-sm border border-gray-200">
            <span className="text-xs font-medium text-gray-600 hidden md:inline px-1">Grid:</span>
            <button 
              onClick={() => adjustGridSize(-5)} 
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Decrease grid size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs min-w-16 text-center font-medium text-gray-800">
              {getGridSizeLabel()}
            </span>
            <button 
              onClick={() => adjustGridSize(5)} 
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Increase grid size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}