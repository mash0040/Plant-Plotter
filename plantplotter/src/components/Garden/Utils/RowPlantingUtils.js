import { checkPlantOverlap, getPlantFootprint, isWithinBounds } from './GardenUtils';

export const clampRowInteger = (value, min, max) => {
  const parsed = parseInt(value, 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min));
};

export const normalizeRowConfig = (config, dimensions) => ({
  count: clampRowInteger(config.count, 1, 50),
  spacing: clampRowInteger(config.spacing, 0, 5),
  direction: config.direction === 'vertical' ? 'vertical' : 'horizontal',
  startX: clampRowInteger(config.startX, 1, dimensions.width),
  startY: clampRowInteger(config.startY, 1, dimensions.height)
});

// Both the dialog and the final placement guard use these footprint checks.
export const validateRowPlacement = (plants, existingPlants, dimensions, gridSize) => {
  const positions = plants.map((plant, index) => ({
    withinBounds: isWithinBounds(plant, dimensions, gridSize),
    overlapsExisting: checkPlantOverlap(plant, existingPlants, gridSize),
    overlapsRow: checkPlantOverlap(plant, plants.filter((_, other) => other !== index), gridSize)
  }));
  let message = '';
  if (!plants.length) message = 'Choose at least one plant for the row.';
  else if (positions.some(position => !position.withinBounds)) {
    message = 'This row does not fit inside the garden. Adjust the count, spacing, direction, or starting position.';
  } else if (positions.some(position => position.overlapsExisting)) {
    message = 'This row overlaps existing plants. Choose a different spot.';
  } else if (positions.some(position => position.overlapsRow)) {
    message = 'Plants in this row overlap each other. Increase spacing and try again.';
  }
  return { positions, success: !message, message };
};

export const getRowPreview = (config, plant, existingPlants, dimensions, gridSize) => {
  const size = getPlantFootprint(plant);
  const positions = Array.from({ length: config.count }, (_, index) => ({
    x: config.startX - 1 + (config.direction === 'horizontal' ? index * (size + config.spacing) : 0),
    y: config.startY - 1 + (config.direction === 'vertical' ? index * (size + config.spacing) : 0),
    index
  }));
  const validation = validateRowPlacement(
    positions.map(position => ({ ...plant, x: position.x * gridSize, y: position.y * gridSize })),
    existingPlants, dimensions, gridSize
  );
  return {
    ...validation,
    positions: positions.map((position, index) => ({ ...position, ...validation.positions[index] }))
  };
};

// Account for SVG letterboxing so taps in the margins cannot select a cell.
export const getOverviewCell = (clientX, clientY, rect, view, dimensions) => {
  const scale = Math.min(rect.width / view.width, rect.height / view.height);
  if (!scale) return null;
  const x = (clientX - rect.left - (rect.width - view.width * scale) / 2) / scale + view.x;
  const y = (clientY - rect.top - (rect.height - view.height * scale) / 2) / scale + view.y;
  if (x < 0 || y < 0 || x >= dimensions.width || y >= dimensions.height) return null;
  return { startX: Math.floor(x) + 1, startY: Math.floor(y) + 1 };
};

export const getRowRevealScroll = (viewport, canvas, bounds, scrollLeft, scrollTop) => {
  const revealAxis = (start, end, visibleSize, current) => {
    if (start >= 12 && end <= visibleSize - 12) return current;
    return Math.max(0, current + (end - start <= visibleSize - 24
      ? (start + end - visibleSize) / 2
      : start - 12));
  };
  return {
    left: revealAxis(canvas.left - viewport.left + bounds.x, canvas.left - viewport.left + bounds.right, viewport.width, scrollLeft),
    top: revealAxis(canvas.top - viewport.top + bounds.y, canvas.top - viewport.top + bounds.bottom, viewport.height, scrollTop),
    behavior: 'instant'
  };
};
