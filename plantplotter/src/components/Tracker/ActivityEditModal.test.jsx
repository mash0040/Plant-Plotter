import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ActivityEditModal from './ActivityEditModal';

const garden = { id: 7, name: 'Patio', plantedItems: [{ name: 'Basil' }] };
const gardens = [garden];
const activity = { id: 12, garden_id: 7, activity_type: 'watered', plant_name: 'Basil',
  notes: 'Morning care', activity_date: '2026-09-10', activity_time: '09:15:32' };

describe('editing performed time', () => {
  it('preserves recorded time including seconds when only notes change', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ActivityEditModal isOpen activity={activity} gardens={gardens} selectedGarden={garden}
      onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Time performed (optional)')).toHaveValue('09:15:32');
    await user.clear(screen.getByLabelText('Notes'));
    await user.type(screen.getByLabelText('Notes'), 'Updated notes');
    fireEvent.submit(screen.getByLabelText('Notes').closest('form'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      id: 12, notes: 'Updated notes', activity_time: '09:15:32'
    })));
  });

  it('retains a changed time after a failed save and lets users explicitly clear it', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ActivityEditModal isOpen activity={activity} gardens={gardens} selectedGarden={garden}
      onSave={onSave} onClose={vi.fn()} />);
    const time = screen.getByLabelText('Time performed (optional)');
    fireEvent.change(time, { target: { value: '13:00' } });
    fireEvent.submit(time.closest('form'));
    await screen.findByRole('alert');
    expect(time).toHaveValue('13:00');
    await user.clear(time);
    fireEvent.submit(time.closest('form'));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ activity_time: null })));
  });
});
