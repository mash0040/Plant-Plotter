import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Grid, ArrowRight, ArrowDown } from 'lucide-react';

export default function RowPlantingModal({ 
  isOpen, 
  onClose, 
  plant, 
  onPlant, 
  gridSize = 40,
  dimensions 
}) {
  const [rowConfig, setRowConfig] = useState({
    count: 5,
    spacing: 1, // grid units between plants
    direction: 'horizontal', // 'horizontal' or 'vertical'
    startX: 1,
    startY: 1
  });
  
  const [previewPositions, setPreviewPositions] = useState([]);

  // Calculate preview positions when config changes
  useEffect(() => {
    if (!plant) return;
    
    const positions = [];
    const plantSize = plant.size || 1;
    
    for (let i = 0; i < rowConfig.count; i++) {
      let x, y;
      
      if (rowConfig.direction === 'horizontal') {
        // Convert from 1-based display to 0-based internal coordinates
        x = (rowConfig.startX - 1) + (i * (plantSize + rowConfig.spacing));
        y = rowConfig.startY - 1;
      } else {
        // Convert from 1-based display to 0-based internal coordinates
        x = rowConfig.startX - 1;
        y = (rowConfig.startY - 1) + (i * (plantSize + rowConfig.spacing));
      }
      
      // Check if position is within bounds (0-based coordinates)
      const withinBounds = x >= 0 && y >= 0 && 
                          x + plantSize <= dimensions.width && 
                          y + plantSize <= dimensions.height;
      
      positions.push({
        x,
        y,
        withinBounds,
        index: i
      });
    }
    
    setPreviewPositions(positions);
  }, [rowConfig, plant, dimensions]);

  const handleConfigChange = (field, value) => {
    setRowConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlantRow = () => {
    const validPositions = previewPositions.filter(pos => pos.withinBounds);
    
    if (validPositions.length === 0) {
      alert('No valid positions found. Please adjust your settings.');
      return;
    }
    
    if (validPositions.length < rowConfig.count) {
      const proceed = confirm(
        `Only ${validPositions.length} out of ${rowConfig.count} plants can fit. Continue?`
      );
      if (!proceed) return;
    }
    
    // Create plant data for each position
    const plantsToAdd = validPositions.map((pos, index) => ({
      ...plant,
      id: `plant-row-${Date.now()}-${index}`,
      plantId: plant.id,
      x: pos.x * gridSize,
      y: pos.y * gridSize,
      isFromLibrary: false,
      plantedDate: new Date(),
      notes: `Row plant ${index + 1}/${validPositions.length}`
    }));
    
    onPlant(plantsToAdd);
    onClose();
  };

  const getDirectionIcon = () => {
    return rowConfig.direction === 'horizontal' ? <ArrowRight className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const totalLength = rowConfig.direction === 'horizontal' 
    ? (rowConfig.startX - 1) + (rowConfig.count * ((plant?.size || 1) + rowConfig.spacing)) - rowConfig.spacing
    : (rowConfig.startY - 1) + (rowConfig.count * ((plant?.size || 1) + rowConfig.spacing)) - rowConfig.spacing;

  const maxLength = rowConfig.direction === 'horizontal' ? dimensions.width : dimensions.height;
  const willFit = totalLength <= maxLength;

  if (!isOpen || !plant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{plant.emoji}</span>
            <h3 className="text-lg font-semibold">Plant Row: {plant.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Plant Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Plants
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConfigChange('count', Math.max(1, rowConfig.count - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={rowConfig.count}
                onChange={(e) => handleConfigChange('count', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                min="1"
                max="50"
              />
              <button
                onClick={() => handleConfigChange('count', Math.min(50, rowConfig.count + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfigChange('direction', 'horizontal')}
                className={`flex items-center gap-2 px-3 py-2 rounded border ${
                  rowConfig.direction === 'horizontal' 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                Horizontal
              </button>
              <button
                onClick={() => handleConfigChange('direction', 'vertical')}
                className={`flex items-center gap-2 px-3 py-2 rounded border ${
                  rowConfig.direction === 'vertical' 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                Vertical
              </button>
            </div>
          </div>

          {/* Spacing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spacing (grid units)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConfigChange('spacing', Math.max(0, rowConfig.spacing - 0.5))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={rowConfig.spacing}
                onChange={(e) => handleConfigChange('spacing', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                min="0"
                step="0.5"
                max="5"
              />
              <button
                onClick={() => handleConfigChange('spacing', Math.min(5, rowConfig.spacing + 0.5))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Space between each plant (0 = touching)
            </p>
          </div>

          {/* Starting Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Position (X, Y)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rowConfig.startX}
                onChange={(e) => handleConfigChange('startX', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                min="1"
                max={dimensions.width}
              />
              <span className="text-gray-500">,</span>
              <input
                type="number"
                value={rowConfig.startY}
                onChange={(e) => handleConfigChange('startY', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                min="1"
                max={dimensions.height}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Grid positions start from 1,1 (top-left corner)
            </p>
          </div>

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Grid className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Preview</span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                {getDirectionIcon()}
                <span>
                  {rowConfig.count} plants in a {rowConfig.direction} row
                </span>
              </div>
              
              <div>
                Total length: {totalLength} units
                {!willFit && (
                  <span className="text-red-600 ml-2">
                    (exceeds {rowConfig.direction === 'horizontal' ? 'width' : 'height'})
                  </span>
                )}
              </div>
              
              <div>
                Valid positions: {previewPositions.filter(p => p.withinBounds).length}/{rowConfig.count}
              </div>
            </div>

            {!willFit && (
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                ⚠️ Some plants will be outside garden boundaries
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePlantRow}
            disabled={previewPositions.filter(p => p.withinBounds).length === 0}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Plant Row ({previewPositions.filter(p => p.withinBounds).length})
          </button>
        </div>
      </div>
    </div>
  );
}