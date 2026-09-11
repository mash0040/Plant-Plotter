import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { X, Plus, Minus, Grid, ArrowRight, ArrowDown } from 'lucide-react';
import useAccessibleDialog from '@/hooks/useAccessibleDialog';
import RowPlantingOverview from './RowPlantingOverview';
import { getPlantFootprint } from './Utils/GardenUtils';
import { clampRowInteger, getRowPreview, normalizeRowConfig } from './Utils/RowPlantingUtils';

const EMPTY_PLANTS = [];

export default function RowPlantingModal({ 
  isOpen, 
  onClose, 
  plant, 
  onPlant, 
  gridSize = 40,
  dimensions,
  placedPlants = EMPTY_PLANTS
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
    spacing: 0,
    direction: 'horizontal', // 'horizontal' or 'vertical'
    startX: 1,
    startY: 1
  });
  const [validationMessage, setValidationMessage] = useState('');
  const validationRef = useRef(null);

  useEffect(() => {
    setValidationMessage('');
  }, [isOpen, plant?.id]);

  useEffect(() => {
    if (validationMessage) {
      validationRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [validationMessage]);

  const normalizedConfig = normalizeRowConfig(rowConfig, dimensions);
  const preview = useMemo(
    () => getRowPreview(normalizeRowConfig(rowConfig, dimensions), plant, placedPlants, dimensions, gridSize),
    [rowConfig, plant, placedPlants, dimensions, gridSize]
  );
  const previewPositions = preview.positions;

  const handleClose = () => {
    setValidationMessage('');
    onClose();
  };

  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen: isOpen && Boolean(plant),
    onClose: handleClose
  });

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
      [field]: clampRowInteger(prev[field], min, max)
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

  const handlePlantRow = () => {
    setRowConfig(normalizedConfig);
    if (!preview.success) {
      setValidationMessage(preview.message);
      return;
    }
    plantValidPositions(previewPositions);
  };

  const getDirectionIcon = () => {
    return rowConfig.direction === 'horizontal' ? <ArrowRight className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const plantSize = getPlantFootprint(plant);
  const totalLength = normalizedConfig.count * plantSize + (normalizedConfig.count - 1) * normalizedConfig.spacing;
  const previewValidationMessage = validationMessage || preview.message;
  const firstPosition = previewPositions[0];
  const lastPosition = previewPositions[previewPositions.length - 1];
  const outOfBoundsCount = previewPositions.filter(position => !position.withinBounds).length;
  const conflictCount = previewPositions.filter(position => position.overlapsExisting || position.overlapsRow).length;

  if (!isOpen || !plant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        {...dialogProps}
        className="flex w-full max-w-md flex-col rounded-lg bg-white p-4 sm:max-w-3xl sm:p-6 max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh]"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{plant.emoji}</span>
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">Plant Row: {plant.name}</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close row planting"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid min-h-0 gap-4 overflow-y-auto sm:grid-cols-2 sm:gap-6">
          <div className="order-2 space-y-4 sm:order-1">
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
                className="flex h-11 w-11 items-center justify-center hover:bg-gray-100 rounded"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id={countInputId}
                type="number"
                value={rowConfig.count}
                onChange={(e) => handleConfigChange('count', e.target.value)}
                onBlur={() => handleNumberBlur('count', 1, 50)}
                className="w-20 min-h-11 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="1"
                max="50"
              />
              <button
                onClick={() => handleConfigChange('count', Math.min(50, normalizedConfig.count + 1))}
                type="button"
                aria-label="Increase number of plants"
                className="flex h-11 w-11 items-center justify-center hover:bg-gray-100 rounded"
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
                className={`flex min-h-11 items-center gap-2 px-3 py-2 rounded border ${
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
                className={`flex min-h-11 items-center gap-2 px-3 py-2 rounded border ${
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
                className={`min-h-11 px-3 py-1 text-xs rounded border ${
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
                className={`min-h-11 px-3 py-1 text-xs rounded border ${
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
                className={`min-h-11 px-3 py-1 text-xs rounded border ${
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
                className="flex h-11 w-11 items-center justify-center hover:bg-gray-100 rounded"
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
                className="w-20 min-h-11 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                min="0"
                step="1"
                max="5"
                aria-describedby={spacingSummaryId}
              />
              <button
                onClick={() => handleConfigChange('spacing', Math.min(5, normalizedConfig.spacing + 1))}
                type="button"
                aria-label="Increase spacing between plants"
                className="flex h-11 w-11 items-center justify-center hover:bg-gray-100 rounded"
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
                className="w-16 min-h-11 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
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
                className="w-16 min-h-11 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
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

          </div>
          {/* Spatial preview uses the same positions and validation as submission. */}
          <div className="order-1 self-start rounded-lg bg-gray-50 p-3 sm:sticky sm:top-0 sm:order-2">
            <div className="flex items-center gap-2 mb-2">
              <Grid className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Row preview</span>
            </div>
            <RowPlantingOverview
              dimensions={dimensions}
              gridSize={gridSize}
              placedPlants={placedPlants}
              positions={previewPositions}
              plant={plant}
              direction={normalizedConfig.direction}
              onSelect={cell => {
                setValidationMessage('');
                setRowConfig(previous => ({ ...previous, ...cell }));
              }}
            />
            <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 space-y-1 text-sm text-gray-700">
              <p className="flex items-center gap-2">{getDirectionIcon()}{normalizedConfig.count} plants, {normalizedConfig.direction}, {totalLength} units long.</p>
              <p>Start: X {firstPosition.x + 1}, Y {firstPosition.y + 1}. End: X {lastPosition.x + 1}, Y {lastPosition.y + 1} (last plant).</p>
              <p>{outOfBoundsCount ? `${outOfBoundsCount} of ${normalizedConfig.count} footprints outside the garden.` : 'All footprints fit inside the garden.'} {conflictCount ? `${conflictCount} of ${normalizedConfig.count} footprints overlap plants.` : 'No overlaps.'}</p>
            </div>
            {previewValidationMessage && (
              <div ref={validationRef} role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {previewValidationMessage}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex shrink-0 gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={handleClose}
            type="button"
            className="min-h-11 flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePlantRow}
            disabled={!preview.success}
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
