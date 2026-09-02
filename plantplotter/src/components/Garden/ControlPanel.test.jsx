import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows both unit choices and converts displayed dimensions when imperial is selected', async () => {
    const user = userEvent.setup();
    renderControlPanel();

    const metricButton = screen.getByRole('button', { name: 'Use metric units' });
    const imperialButton = screen.getByRole('button', { name: 'Use imperial units' });

    expect(metricButton).toHaveAttribute('aria-pressed', 'true');
    expect(imperialButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(imperialButton);

    expect(metricButton).toHaveAttribute('aria-pressed', 'false');
    expect(imperialButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Garden width' })).toHaveValue(19.69);
    expect(screen.getByRole('spinbutton', { name: 'Garden height' })).toHaveValue(13.12);
  });

  it('aligns dimension and zoom controls into consistent columns', () => {
    renderControlPanel();

    const widthControls = screen.getByRole('group', { name: 'Width controls' });
    const heightControls = screen.getByRole('group', { name: 'Height controls' });
    const zoomControls = screen.getByRole('group', { name: 'Zoom controls' });

    expect(screen.getByRole('button', { name: 'Increase garden width' }).parentElement).toHaveClass('grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem]', 'justify-self-end');
    expect(screen.getByRole('button', { name: 'Increase garden height' }).parentElement).toHaveClass('grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem]', 'justify-self-end');
    expect(screen.getByRole('button', { name: 'Zoom in' }).parentElement).toHaveClass('grid-cols-[2.25rem_3.5rem_1.5rem_2.25rem]', 'justify-self-end');
    expect(within(widthControls).getByRole('spinbutton', { name: 'Garden width' })).toBeInTheDocument();
    expect(within(heightControls).getByRole('spinbutton', { name: 'Garden height' })).toBeInTheDocument();
    expect(within(zoomControls).getByRole('spinbutton', { name: 'Garden zoom percentage' })).toBeInTheDocument();
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
