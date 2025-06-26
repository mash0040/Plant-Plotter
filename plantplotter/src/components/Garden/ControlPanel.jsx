'use client';
import { Plus, Minus, Grid, Ruler, Save, FolderOpen, Menu } from 'lucide-react';

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
  onToggleSidebar
}) {
  const adjustDimension = (type, delta) => {
    const newValue = Math.max(1, Math.min(50, dimensions[type] + delta));
    onDimensionChange({ ...dimensions, [type]: newValue });
  };

  const adjustGridSize = (delta) => {
    const newSize = Math.max(20, Math.min(100, gridSize + delta));
    onGridSizeChange(newSize);
  };

  return (
    <div className="bg-white border-b border-gray-200 p-2 sm:p-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section - Title and Mobile Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onToggleSidebar && (
            <button 
              onClick={onToggleSidebar}
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold whitespace-nowrap">Garden Basil</h1>
            {hasUnsavedChanges && (
              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded whitespace-nowrap">
                Unsaved changes
              </span>
            )}
          </div>
        </div>
        
        {/* Right Section - All Controls */}
        <div className="flex items-center gap-1 sm:gap-3 text-sm flex-wrap">
          {/* View & Save Controls Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded p-1">
            <button
              onClick={onToggleGrid}
              className={`p-1.5 rounded flex items-center gap-1 text-xs ${
                showGrid ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={onToggleRuler}
              className={`p-1.5 rounded flex items-center gap-1 text-xs ${
                showRuler ? 'bg-green-100 text-green-700' : 'hover:bg-gray-100'
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span className="hidden sm:inline">Ruler</span>
            </button>
            <button 
              onClick={onSave}
              className={`p-1.5 rounded flex items-center gap-1 text-xs ${
                hasUnsavedChanges ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'hover:bg-gray-100'
              }`}
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>


          {/* Dimension Controls Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded p-1">
            <span className="text-xs font-medium hidden md:inline text-gray-600">Size:</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => adjustDimension('width', -1)} 
                      className="p-1 hover:bg-gray-100 rounded">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs min-w-6 text-center font-medium">{dimensions.width}</span>
              <button onClick={() => adjustDimension('width', 1)} 
                      className="p-1 hover:bg-gray-100 rounded">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs text-gray-400">×</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => adjustDimension('height', -1)} 
                      className="p-1 hover:bg-gray-100 rounded">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs min-w-6 text-center font-medium">{dimensions.height}</span>
              <button onClick={() => adjustDimension('height', 1)} 
                      className="p-1 hover:bg-gray-100 rounded">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grid Size Control Group */}
          <div className="flex items-center gap-1 bg-gray-50 rounded p-1">
            <span className="text-xs font-medium hidden md:inline text-gray-600">Grid:</span>
            <button onClick={() => adjustGridSize(-5)} 
                    className="p-1 hover:bg-gray-100 rounded">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs min-w-8 text-center font-medium">{gridSize}px</span>
            <button onClick={() => adjustGridSize(5)} 
                    className="p-1 hover:bg-gray-100 rounded">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}