import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GardenCanvas from './GardenCanvas';

vi.mock('@dnd-kit/core', () => ({ useDroppable: () => ({ setNodeRef: vi.fn() }) }));
vi.mock('./DraggablePlant', () => ({ default: ({ plant, disableDrag }) => <div data-testid={plant.id} data-drag-disabled={disableDrag} /> }));

const props = {
  dimensions: { width: 40, height: 40 }, gridSize: 40, showGrid: true, showRuler: true,
  placedPlants: [], onPlantRemove: vi.fn()
};
const rowReveal = { gridSize: 40, plants: [{ id: 'new-1', x: 25, y: 28, size: 2 }, { id: 'new-2', x: 27, y: 28, size: 2 }] };

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('GardenCanvas row reveal', () => {
  it('scrolls only after a row is added, briefly highlights its plants, and preserves desktop dragging', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<GardenCanvas {...props} />);
    const viewport = container.querySelector('[data-garden-viewport]');
    const canvas = container.querySelector('[data-canvas]');
    viewport.scrollTo = vi.fn();
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20 });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 60, top: 80 });
    Object.defineProperties(viewport, { clientWidth: { configurable: true, value: 320 }, clientHeight: { configurable: true, value: 400 } });
    expect(viewport.scrollTo).not.toHaveBeenCalled();
    rerender(<GardenCanvas {...props} rowReveal={rowReveal} placedPlants={rowReveal.plants} />);
    expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 970, top: 1020, behavior: 'instant' });
    expect(container.querySelectorAll('[data-row-highlight]')).toHaveLength(2);
    expect(screen.getByText('New row')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 plants added.');
    expect(screen.getByTestId('new-1')).toHaveAttribute('data-drag-disabled', 'false');
    rerender(<GardenCanvas {...props} gridSize={60} rowReveal={rowReveal} placedPlants={rowReveal.plants} />);
    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2400));
    expect(container.querySelectorAll('[data-row-highlight]')).toHaveLength(0);
    expect(viewport.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('clears highlights for a changed garden and cancels the previous timer for a new row', () => {
    vi.useFakeTimers();
    const { container, rerender, unmount } = render(<GardenCanvas {...props} />);
    container.querySelector('[data-garden-viewport]').scrollTo = vi.fn();
    rerender(<GardenCanvas {...props} rowReveal={rowReveal} placedPlants={rowReveal.plants} disablePlantDragging />);
    expect(screen.getByTestId('new-1')).toHaveAttribute('data-drag-disabled', 'true');
    act(() => vi.advanceTimersByTime(2000));
    const nextRow = { gridSize: 40, plants: [{ id: 'next', x: 10, y: 10, size: 1 }] };
    rerender(<GardenCanvas {...props} rowReveal={nextRow} placedPlants={nextRow.plants} />);
    act(() => vi.advanceTimersByTime(500));
    expect(container.querySelectorAll('[data-row-highlight]')).toHaveLength(1);
    rerender(<GardenCanvas {...props} rowReveal={null} />);
    expect(container.querySelectorAll('[data-row-highlight]')).toHaveLength(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
