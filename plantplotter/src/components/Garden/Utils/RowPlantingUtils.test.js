import { describe, expect, it } from 'vitest';
import { getOverviewCell, getRowPreview, getRowRevealScroll, normalizeRowConfig, validateRowPlacement } from './RowPlantingUtils';

const dimensions = { width: 12, height: 8 };
const config = { count: 3, spacing: 1, direction: 'horizontal', startX: 2, startY: 3 };

describe('row placement calculations', () => {
  it('normalizes partial input and preserves integer grid coordinates', () => {
    expect(normalizeRowConfig({ count: '', spacing: 8, startX: -5, startY: 99 }, dimensions)).toEqual({ count: 1, spacing: 5, startX: 1, startY: 8, direction: 'horizontal' });
    expect(normalizeRowConfig({ ...config, count: '3.8', startX: '2.9' }, dimensions)).toEqual(config);
  });

  it.each([20, 40, 60])('keeps footprint calculations and overlap detection consistent at grid size %i', gridSize => {
    const preview = getRowPreview(config, { plant_size: '2' }, [{ x: 7.5 * gridSize, y: 2 * gridSize, size: 1 }], dimensions, gridSize);
    expect(preview.positions.map(({ x, y }) => [x, y])).toEqual([[1, 2], [4, 2], [7, 2]]);
    expect(preview.positions.map(p => p.overlapsExisting)).toEqual([false, false, true]);
    expect(preview.success).toBe(false);
  });

  it('allows footprints to touch and detects overlap within the submitted row', () => {
    const plants = [{ x: 0, y: 0, size: 2 }, { x: 80, y: 0, size: 2 }];
    expect(validateRowPlacement(plants, [{ x: 160, y: 0, size: 1 }], dimensions, 40).success).toBe(true);
    const invalid = validateRowPlacement([plants[0], { ...plants[1], x: 40 }], [], dimensions, 40);
    expect(invalid.success).toBe(false);
    expect(invalid.positions.every(p => p.overlapsRow)).toBe(true);
    expect(validateRowPlacement([], [], dimensions, 40).success).toBe(false);
  });

  it('detects vertical and perpendicular overflow without dropping any positions', () => {
    const preview = getRowPreview({ ...config, direction: 'vertical', startX: 12 }, { size: 2 }, [], dimensions, 40);
    expect(preview.positions).toHaveLength(3);
    expect(preview.positions.every(p => !p.withinBounds)).toBe(true);
    expect(preview.positions[2]).toMatchObject({ x: 11, y: 8 });
  });
});

describe('overview pointer coordinates', () => {
  it.each([
    [{ width: 20, height: 10 }, { width: 200, height: 200 }, [35, 85]],
    [{ width: 10, height: 20 }, { width: 200, height: 200 }, [85, 35]]
  ])('maps rectangular gardens without distorting the axes', (garden, rect, point) => {
    expect(getOverviewCell(...point, { left: 10, top: 20, ...rect }, { x: 0, y: 0, ...garden }, garden)).toEqual({ startX: 3, startY: 2 });
  });

  it('ignores letterboxing, garden edges, and proposed overflow outside the boundary', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 };
    const view = { x: 0, y: 0, width: 20, height: 10 };
    expect(getOverviewCell(50, 10, rect, view, dimensions)).toBeNull();
    expect(getOverviewCell(120, 50, rect, view, dimensions)).toBeNull();
    expect(getOverviewCell(190, 60, rect, view, dimensions)).toBeNull();
    expect(getOverviewCell(0, 50, rect, view, dimensions)).toEqual({ startX: 1, startY: 1 });
  });
});

describe('canvas row reveal', () => {
  const viewport = { left: 10, top: 20, width: 300, height: 400 };

  it('preserves the current view when the entire row is visible', () => {
    expect(getRowRevealScroll(viewport, { left: 20, top: 30 }, { x: 20, y: 20, right: 200, bottom: 200 }, 50, 60)).toEqual({ left: 50, top: 60, behavior: 'instant' });
  });

  it('centers an offscreen row on both axes with ruler and scroll offsets included', () => {
    expect(getRowRevealScroll(viewport, { left: -100, top: -80 }, { x: 800, y: 900, right: 960, bottom: 980 }, 160, 200)).toEqual({ left: 780, top: 840, behavior: 'instant' });
  });

  it('reveals the start when the row is longer than the viewport', () => {
    expect(getRowRevealScroll(viewport, { left: 10, top: 20 }, { x: 800, y: 900, right: 2000, bottom: 940 }, 0, 0)).toEqual({ left: 788, top: 720, behavior: 'instant' });
  });
});
