import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RowPlantingModal from './RowPlantingModal';

const plant = {
  id: 'carrot',
  name: 'Carrot',
  emoji: 'C',
  size: 1
};

const renderRowPlantingModal = (props = {}) => {
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
      {...props}
    />
  );

  return { onClose, onPlant };
};

describe('RowPlantingModal accessibility', () => {
  it('keeps a rejected overlap visible after submission and allows a corrected retry', async () => {
    const user = userEvent.setup();
    const { onClose, onPlant } = renderRowPlantingModal();
    const message = 'This row overlaps existing plants. Choose a different spot.';
    onPlant.mockReturnValue({ success: false, message });

    await user.click(screen.getByRole('button', { name: 'Plant Row (5)' }));
    expect(onPlant).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(message)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Plant Row (5)' }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    onPlant.mockReturnValue({ success: true });
    await user.click(screen.getByRole('button', { name: 'Plant Row (5)' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a fallback message when placement is rejected without a reason', async () => {
    const user = userEvent.setup();
    const { onClose, onPlant } = renderRowPlantingModal();
    onPlant.mockReturnValue({ success: false });
    await user.click(screen.getByRole('button', { name: 'Plant Row (5)' }));
    expect(screen.getByText('Row planting failed. Adjust the row and try again.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

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

describe('RowPlantingModal spatial preview', () => {
  it('shows existing overlap before submission and enables a corrected row', async () => {
    const user = userEvent.setup();
    const { onPlant } = renderRowPlantingModal({ placedPlants: [{ id: 'existing', x: 80, y: 0, size: 2 }] });
    expect(screen.getByRole('status')).toHaveTextContent('2 of 5 footprints overlap plants.');
    const button = screen.getByRole('button', { name: 'Plant Row (5)' });
    expect(button).toBeDisabled();
    expect(document.querySelectorAll('[data-valid="false"]')).toHaveLength(2);
    await user.click(button);
    expect(onPlant).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Starting Y coordinate' }), { target: { value: '3' } });
    expect(button).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('No overlaps.');
    await user.click(button);
    expect(onPlant.mock.calls[0][0]).toHaveLength(5);
    expect(onPlant.mock.calls[0][0][0]).toMatchObject({ x: 0, y: 80 });
  });

  it('blocks partially fitting rows and perpendicular footprint overflow', async () => {
    const user = userEvent.setup();
    const { onPlant } = renderRowPlantingModal({ plant: { ...plant, size: 2 }, dimensions: { width: 8, height: 4 } });
    const button = screen.getByRole('button', { name: 'Plant Row (5)' });
    expect(button).toBeDisabled();
    expect(document.querySelectorAll('[data-row-position]')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('1 of 5 footprints outside the garden.');
    await user.click(button);
    expect(onPlant).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of Plants' }), { target: { value: '2' } });
    expect(screen.getByRole('button', { name: 'Plant Row (2)' })).toBeEnabled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Starting Y coordinate' }), { target: { value: '4' } });
    expect(screen.getByRole('button', { name: 'Plant Row (2)' })).toBeDisabled();
    expect(document.querySelectorAll('[data-valid="false"]')).toHaveLength(2);
  });

  it('synchronizes a tap/click with one-based fields, summary, and saved pixel positions', async () => {
    const user = userEvent.setup();
    const { onPlant } = renderRowPlantingModal();
    const overview = screen.getByRole('img', { name: /Garden row overview/ });
    // The square viewBox includes 0.3 units padding on each side.
    vi.spyOn(overview, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 252, height: 252 });
    fireEvent.click(overview, { clientX: 66, clientY: 96 });
    expect(screen.getByRole('spinbutton', { name: 'Starting X coordinate' })).toHaveValue(3);
    expect(screen.getByRole('spinbutton', { name: 'Starting Y coordinate' })).toHaveValue(4);
    expect(screen.getByRole('status')).toHaveTextContent('Start: X 3, Y 4. End: X 7, Y 4');
    await user.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(screen.getByRole('status')).toHaveTextContent('End: X 3, Y 8');
    await user.click(screen.getByRole('button', { name: 'Plant Row (5)' }));
    expect(onPlant.mock.calls[0][0].map(({ x, y }) => [x, y])).toEqual([[80, 120], [80, 160], [80, 200], [80, 240], [80, 280]]);
  });

  it('updates preview positions immediately for count, spacing, direction, and numeric start', () => {
    renderRowPlantingModal();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of Plants' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Spacing Between Plants' }), { target: { value: '1' } });
    expect(screen.getByRole('status')).toHaveTextContent('3 plants, horizontal, 5 units long.');
    expect(screen.getByRole('status')).toHaveTextContent('End: X 5, Y 1');
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Starting X coordinate' }), { target: { value: '2' } });
    expect(screen.getByRole('status')).toHaveTextContent('Start: X 2, Y 1. End: X 2, Y 5');
    expect(document.querySelectorAll('[data-row-position]')).toHaveLength(3);
  });

  it('revalidates when existing plants change while the dialog is open', () => {
    const props = { isOpen: true, onClose: vi.fn(), onPlant: vi.fn(), plant, gridSize: 40, dimensions: { width: 12, height: 12 } };
    const { rerender } = render(<RowPlantingModal {...props} placedPlants={[]} />);
    expect(screen.getByRole('button', { name: 'Plant Row (5)' })).toBeEnabled();
    rerender(<RowPlantingModal {...props} placedPlants={[{ id: 'added', x: 0, y: 0, size: 1 }]} />);
    expect(screen.getByRole('button', { name: 'Plant Row (5)' })).toBeDisabled();
  });

  it('keeps large gardens bounded to footprints instead of interactive grid cells', () => {
    renderRowPlantingModal({ dimensions: { width: 1000, height: 1000 } });
    const overview = screen.getByRole('img', { name: /Garden row overview/ });
    expect(overview.querySelectorAll('*').length).toBeLessThan(40);
    expect(overview.querySelectorAll('[data-row-position]')).toHaveLength(5);
  });

  it('keeps the direction arrow inside a single footprint that fills a tiny garden', () => {
    renderRowPlantingModal({ plant: { ...plant, size: 2 }, dimensions: { width: 2, height: 2 } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Number of Plants' }), { target: { value: '1' } });
    const overview = screen.getByRole('img', { name: /Garden row overview/ });
    const arrow = overview.querySelector('line');
    expect(Number(arrow.getAttribute('x2'))).toBeLessThan(2);
    expect(Number(arrow.getAttribute('x2'))).toBeGreaterThan(Number(arrow.getAttribute('x1')));
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(Number(arrow.getAttribute('y2'))).toBeLessThan(2);
    expect(Number(arrow.getAttribute('y2'))).toBeGreaterThan(Number(arrow.getAttribute('y1')));
    expect(screen.getByRole('button', { name: 'Plant Row (1)' })).toBeEnabled();
  });
});
