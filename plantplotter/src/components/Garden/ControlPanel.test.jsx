import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ControlPanel from './ControlPanel';

const renderControlPanel = (props = {}) => render(
  <ControlPanel
    dimensions={{ width: 6, height: 4 }}
    gridSize={40}
    showGrid
    showRuler={false}
    onDimensionChange={vi.fn()}
    onGridSizeChange={vi.fn()}
    onToggleGrid={vi.fn()}
    onToggleRuler={vi.fn()}
    onSave={vi.fn()}
    hasUnsavedChanges={false}
    gardenName="Kitchen Garden"
    {...props}
  />
);

describe('ControlPanel accessibility', () => {
  it('exposes toggle state and dependable control names', () => {
    renderControlPanel();

    expect(screen.getByRole('button', { name: 'Toggle garden grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Toggle garden ruler' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('spinbutton', { name: 'Garden zoom percentage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease garden width' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase garden height' })).toBeInTheDocument();
  });
});
