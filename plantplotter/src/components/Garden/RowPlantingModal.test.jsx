import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RowPlantingModal from './RowPlantingModal';

const plant = {
  id: 'carrot',
  name: 'Carrot',
  emoji: 'C',
  size: 1
};

const renderRowPlantingModal = () => {
  const onClose = vi.fn();
  const onPlant = vi.fn(() => ({ success: true }));

  render(
    <RowPlantingModal
      isOpen
      onClose={onClose}
      plant={plant}
      onPlant={onPlant}
      gridSize={40}
      dimensions={{ width: 12, height: 12 }}
    />
  );

  return { onClose, onPlant };
};

describe('RowPlantingModal accessibility', () => {
  it('labels each numeric field and gives every stepper a specific name', () => {
    renderRowPlantingModal();

    expect(screen.getByRole('spinbutton', { name: 'Number of Plants' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Spacing Between Plants' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Starting X coordinate' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Starting Y coordinate' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Decrease number of plants' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase number of plants' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease spacing between plants' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase spacing between plants' })).toBeInTheDocument();
  });

  it('exposes the selected direction and spacing preset', async () => {
    const user = userEvent.setup();
    renderRowPlantingModal();

    const horizontalButton = screen.getByRole('button', { name: 'Horizontal' });
    const verticalButton = screen.getByRole('button', { name: 'Vertical' });
    const noGapButton = screen.getByRole('button', { name: 'No Gap' });
    const normalGapButton = screen.getByRole('button', { name: 'Normal Gap' });

    expect(horizontalButton).toHaveAttribute('aria-pressed', 'true');
    expect(verticalButton).toHaveAttribute('aria-pressed', 'false');
    expect(noGapButton).toHaveAttribute('aria-pressed', 'true');
    expect(normalGapButton).toHaveAttribute('aria-pressed', 'false');

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    verticalButton.focus();
    await user.keyboard('{Enter}');
    normalGapButton.focus();
    await user.keyboard(' ');

    expect(horizontalButton).toHaveAttribute('aria-pressed', 'false');
    expect(verticalButton).toHaveAttribute('aria-pressed', 'true');
    expect(noGapButton).toHaveAttribute('aria-pressed', 'false');
    expect(normalGapButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports configuring and planting a row with the keyboard', async () => {
    const user = userEvent.setup();
    const { onClose, onPlant } = renderRowPlantingModal();

    const countInput = screen.getByRole('spinbutton', { name: 'Number of Plants' });
    const startXInput = screen.getByRole('spinbutton', { name: 'Starting X coordinate' });
    const startYInput = screen.getByRole('spinbutton', { name: 'Starting Y coordinate' });

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close row planting' })).toHaveFocus();

    countInput.focus();
    await user.clear(countInput);
    await user.type(countInput, '3');

    screen.getByRole('button', { name: 'Vertical' }).focus();
    await user.keyboard('{Enter}');

    screen.getByRole('button', { name: 'Normal Gap' }).focus();
    await user.keyboard(' ');

    startXInput.focus();
    await user.clear(startXInput);
    await user.type(startXInput, '2');
    startYInput.focus();
    await user.clear(startYInput);
    await user.type(startYInput, '3');

    const plantRowButton = await screen.findByRole('button', { name: 'Plant Row (3)' });
    plantRowButton.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onPlant).toHaveBeenCalledTimes(1));
    expect(onPlant.mock.calls[0][0]).toEqual([
      expect.objectContaining({ plantId: 'carrot', x: 40, y: 80 }),
      expect.objectContaining({ plantId: 'carrot', x: 40, y: 200 }),
      expect.objectContaining({ plantId: 'carrot', x: 40, y: 320 })
    ]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
