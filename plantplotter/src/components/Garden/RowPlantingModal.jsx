import React, { useEffect, useId, useState } from 'react';
import { X, Plus, Minus, Grid, ArrowRight, ArrowDown } from 'lucide-react';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';

export default function RowPlantingModal({ 
  isOpen, 
  onClose, 
  plant, 
  onPlant, 
  gridSize = 40,
  dimensions 
}) {
  const controlIdPrefix = useId();
  const countInputId = `${controlIdPrefix}-count`;
  const spacingInputId = `${controlIdPrefix}-spacing`;
  const spacingSummaryId = `${controlIdPrefix}-spacing-summary`;
  const startPositionHelpId = `${controlIdPrefix}-start-position-help`;
  const startXInputId = `${controlIdPrefix}-start-x`;
  const startYInputId = `${controlIdPrefix}-start-y`;
  const [rowConfig, setRowConfig] = useState({
    count: 5,
    spacing: 0, // Changed default to 0 for no spacing
    direction: 'horizontal', // 'horizontal' or 'vertical'
    startX: 1,
    startY: 1
  });
  
  const [previewPositions, setPreviewPositions] = useState([]);
  const [validationMessage, setValidationMessage] = useState('');

  const toInteger = (value, fallback = 0) => {
    const parsedValue = parseInt(value, 10);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  };

  const clampInteger = (value, min, max) => Math.min(max, Math.max(min, toInteger(value, min)));

  const getNormalizedConfig = () => ({
    count: clampInteger(rowConfig.count, 1, 50),
    spacing: clampInteger(rowConfig.spacing, 0, 5),
    direction: rowConfig.direction,
    startX: clampInteger(rowConfig.startX, 1, dimensions.width),
    startY: clampInteger(rowConfig.startY, 1, dimensions.height)
  });

  const handleClose = () => {
    setValidationMessage('');
    onClose();
  };

  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen: isOpen && Boolean(plant),
    onClose: handleClose
  });

  // Calculate preview positions when config changes
  useEffect(() => {
    if (!plant) return;
    setValidationMessage('');
    
    const normalizedConfig = getNormalizedConfig();
    const positions = [];
    const plantSize = plant.size || 1;
    
    for (let i = 0; i < normalizedConfig.count; i++) {
      let x, y;
      
      if (normalizedConfig.direction === 'horizontal') {
        // Convert from 1-based display to 0-based internal coordinates
        // When spacing is 0, plants touch each other (only plantSize distance)
        const effectiveSpacing = normalizedConfig.spacing === 0 ? 0 : normalizedConfig.spacing;
        x = (normalizedConfig.startX - 1) + (i * (plantSize + effectiveSpacing));
        y = normalizedConfig.startY - 1;
      } else {
        // Convert from 1-based display to 0-based internal coordinates
        const effectiveSpacing = normalizedConfig.spacing === 0 ? 0 : normalizedConfig.spacing;
        x = normalizedConfig.startX - 1;
        y = (normalizedConfig.startY - 1) + (i * (plantSize + effectiveSpacing));
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
    setValidationMessage('');
    setRowConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberBlur = (field, min, max) => {
    setRowConfig(prev => ({
      ...prev,
      [field]: clampInteger(prev[field], min, max)
    }));
  };

  const plantValidPositions = (validPositions) => {
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
    
    const result = onPlant(plantsToAdd);
    if (result?.success === false) {
      setValidationMessage(result.message || 'Row planting failed. Adjust the row and try again.');
      return;
    }

    handleClose();
  };

  const boundaryValidationMessage = 'This row does not fit inside the garden. Adjust the count, spacing, direction, or starting position.';

  const handlePlantRow = () => {
    const normalizedConfig = getNormalizedConfig();

    setRowConfig(prev => ({
      ...prev,
      count: normalizedConfig.count,
      spacing: normalizedConfig.spacing,
      startX: normalizedConfig.startX,
      startY: normalizedConfig.startY
    }));

    const validPositions = previewPositions.filter(pos => pos.withinBounds);

    if (validPositions.length === 0) {
      setValidationMessage('No valid positions found. Please adjust your settings.');
      return;
    }

    if (validPositions.length < normalizedConfig.count) {
      setValidationMessage(boundaryValidationMessage);
      return;
    }

    plantValidPositions(validPositions);
  };

  const getDirectionIcon = () => {
    return rowConfig.direction === 'horizontal' ? <ArrowRight className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Updated calculation for total length - when spacing is 0, plants just touch
  const plantSize = plant?.size || 1;
  const normalizedConfig = getNormalizedConfig();
  const effectiveSpacing = normalizedConfig.spacing === 0 ? 0 : normalizedConfig.spacing;
  const totalLength = normalizedConfig.direction === 'horizontal'
    ? (normalizedConfig.startX - 1) + (normalizedConfig.count * plantSize) + ((normalizedConfig.count - 1) * effectiveSpacing)
    : (normalizedConfig.startY - 1) + (normalizedConfig.count * plantSize) + ((normalizedConfig.count - 1) * effectiveSpacing);

  const maxLength = normalizedConfig.direction === 'horizontal' ? dimensions.width : dimensions.height;
  const willFit = totalLength <= maxLength;
  const previewValidationMessage = validationMessage || (!willFit ? boundaryValidationMessage : '');

  if (!isOpen || !plant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        {...dialogProps}
        className="bg-white rounded-lg p-4 sm:p-6 w-96 max-w-[90vw] max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{plant.emoji}</span>
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">Plant Row: {plant.name}</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close row planting"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Row planting adds multiple of the same plant.
          </p>

          {/* Plant Count */}
          <div>
            <label htmlFor={countInputId} className="block text-sm font-medium text-gray-700 mb-2">
              Number of Plants
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConfigChange('count', Math.max(1, normalizedConfig.count - 1))}
                type="button"
                aria-label="Decrease number of plants"
                className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id={countInputId}
                type="number"
                value={rowConfig.count}
                onChange={(e) => handleConfigChange('count', e.target.value)}
                onBlur={() => handleNumberBlur('count', 1, 50)}
                className="w-20 min-h-10 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="1"
                max="50"
              />
              <button
                onClick={() => handleConfigChange('count', Math.min(50, normalizedConfig.count + 1))}
                type="button"
                aria-label="Increase number of plants"
                className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Direction */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </legend>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfigChange('direction', 'horizontal')}
                type="button"
                aria-pressed={rowConfig.direction === 'horizontal'}
                className={`flex min-h-10 items-center gap-2 px-3 py-2 rounded border ${
                  rowConfig.direction === 'horizontal' 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                Horizontal
              </button>
              <button
                onClick={() => handleConfigChange('direction', 'vertical')}
                type="button"
                aria-pressed={rowConfig.direction === 'vertical'}
                className={`flex min-h-10 items-center gap-2 px-3 py-2 rounded border ${
                  rowConfig.direction === 'vertical' 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                Vertical
              </button>
            </div>
          </fieldset>

          {/* Spacing with Quick Options */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Spacing Between Plants
            </legend>
            
            {/* Quick spacing options */}
            <div className="flex gap-2 mb-2" role="group" aria-label="Spacing presets">
              <button
                onClick={() => handleConfigChange('spacing', 0)}
                type="button"
                aria-pressed={normalizedConfig.spacing === 0}
                className={`px-3 py-1 text-xs rounded border ${
                  normalizedConfig.spacing === 0 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                No Gap
              </button>
              <button
                onClick={() => handleConfigChange('spacing', 1)}
                type="button"
                aria-pressed={normalizedConfig.spacing === 1}
                className={`px-3 py-1 text-xs rounded border ${
                  normalizedConfig.spacing === 1
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                Small Gap
              </button>
              <button
                onClick={() => handleConfigChange('spacing', 2)}
                type="button"
                aria-pressed={normalizedConfig.spacing === 2}
                className={`px-3 py-1 text-xs rounded border ${
                  normalizedConfig.spacing === 2
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                Normal Gap
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleConfigChange('spacing', Math.max(0, normalizedConfig.spacing - 1))}
                type="button"
                aria-label="Decrease spacing between plants"
                className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <label htmlFor={spacingInputId} className="sr-only">Spacing Between Plants</label>
              <input
                id={spacingInputId}
                type="number"
                value={rowConfig.spacing}
                onChange={(e) => handleConfigChange('spacing', e.target.value)}
                onBlur={() => handleNumberBlur('spacing', 0, 5)}
                className="w-20 min-h-10 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="0"
                step="1"
                max="5"
                aria-describedby={spacingSummaryId}
              />
              <button
                onClick={() => handleConfigChange('spacing', Math.min(5, normalizedConfig.spacing + 1))}
                type="button"
                aria-label="Increase spacing between plants"
                className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600">grid units</span>
            </div>
            <p id={spacingSummaryId} className="text-xs text-gray-600 mt-1">
              {normalizedConfig.spacing === 0 ? 'Plants will touch each other' : `${normalizedConfig.spacing} unit${normalizedConfig.spacing !== 1 ? 's' : ''} between plants`}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Spacing uses full grid units so saved layouts stay aligned to the garden grid.
            </p>
          </fieldset>

          {/* Starting Position */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Starting Position (X, Y)
            </legend>
            <div className="flex items-center gap-2">
              <label htmlFor={startXInputId} className="flex items-center gap-1 text-xs font-medium text-gray-700">
                X
              </label>
              <input
                id={startXInputId}
                type="number"
                value={rowConfig.startX}
                onChange={(e) => handleConfigChange('startX', e.target.value)}
                onBlur={() => handleNumberBlur('startX', 1, dimensions.width)}
                className="w-16 min-h-10 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="1"
                max={dimensions.width}
                aria-label="Starting X coordinate"
                aria-describedby={startPositionHelpId}
              />
              <span className="text-gray-600">,</span>
              <label htmlFor={startYInputId} className="flex items-center gap-1 text-xs font-medium text-gray-700">
                Y
              </label>
              <input
                id={startYInputId}
                type="number"
                value={rowConfig.startY}
                onChange={(e) => handleConfigChange('startY', e.target.value)}
                onBlur={() => handleNumberBlur('startY', 1, dimensions.height)}
                className="w-16 min-h-10 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="1"
                max={dimensions.height}
                aria-label="Starting Y coordinate"
                aria-describedby={startPositionHelpId}
              />
            </div>
            <p id={startPositionHelpId} className="text-xs text-gray-600 mt-1">
              Grid positions start from 1,1 (top-left corner)
            </p>
          </fieldset>

          {/* Preview Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Grid className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Preview</span>
            </div>

            {previewValidationMessage && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {previewValidationMessage}
              </div>
            )}
            
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex items-center gap-2">
                {getDirectionIcon()}
                <span>
                  {normalizedConfig.count} plants in a {normalizedConfig.direction} row
                  {normalizedConfig.spacing === 0 && <span className="text-green-600 font-medium"> (touching)</span>}
                </span>
              </div>
              
              <div>
                Total length: {totalLength} units
                {!willFit && (
                  <span className="text-red-600 ml-2">
                    (exceeds {normalizedConfig.direction === 'horizontal' ? 'width' : 'height'})
                  </span>
                )}
              </div>
              
              <div>
                Positions in bounds: {previewPositions.filter(p => p.withinBounds).length}/{normalizedConfig.count}
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            type="button"
            className="min-h-11 flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePlantRow}
            disabled={previewPositions.filter(p => p.withinBounds).length === 0}
            type="button"
            className="min-h-11 flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Plant Row ({normalizedConfig.count})
          </button>
        </div>
      </div>
    </div>
  );
}
