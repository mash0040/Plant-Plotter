import { render, screen, within } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Kitchen Garden' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle garden grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Toggle garden ruler' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('spinbutton', { name: 'Garden zoom percentage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease garden width' })).toHaveClass('touch-target');
    expect(screen.getByRole('button', { name: 'Increase garden height' })).toHaveClass('touch-target');
    expect(screen.getByRole('spinbutton', { name: 'Garden zoom percentage' })).toHaveClass('touch-target');
  });

  it('keeps navigation, save state, and secondary tools in distinct groups', () => {
    renderControlPanel({
      onBackClick: vi.fn(),
      onToggleSidebar: vi.fn(),
      hasUnsavedChanges: true,
      saveMessage: 'Layout saved.'
    });

    const navigation = screen.getByRole('group', { name: 'Planner navigation' });
    expect(within(navigation).getByRole('button', { name: 'Back to Garden List' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Open plant library' })).toBeInTheDocument();

    const saveStatus = screen.getByText('Unsaved');
    const saveButton = screen.getByRole('button', { name: 'Save garden' });
    expect(saveStatus).toHaveAttribute('role', 'status');
    expect(saveStatus.parentElement).toContainElement(saveButton);
    expect(screen.getByText('Layout saved.')).toHaveAttribute('role', 'status');

    expect(screen.getByRole('group', { name: 'View controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Dimension unit' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Garden size controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Zoom controls' })).toBeInTheDocument();
  });

  it('preserves save errors as alerts beside the save controls', () => {
    renderControlPanel({ saveError: 'Unable to save the layout.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save the layout.');
  });
});
