import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TrackingCalendar from './TrackingCalendar';

describe('TrackingCalendar accessibility', () => {
  it('selects calendar dates through named buttons', async () => {
    const today = new Date();
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const targetDay = today.getDate() === 1 ? 2 : 1;
    const targetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
    const targetLabel = new Date(today.getFullYear(), today.getMonth(), targetDay).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const onDateSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <TrackingCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
      />
    );

    await user.click(screen.getByRole('button', { name: `Select ${targetLabel}` }));
    expect(onDateSelect).toHaveBeenCalledWith(targetDate);
  });

  it('keeps selected-date activity actions available to touch users', async () => {
    const today = new Date();
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const activity = {
      id: 12,
      activity: 'watered',
      plant: 'Tomato',
      time: '09:00'
    };
    const onActivityEdit = vi.fn();
    const onActivityDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <TrackingCalendar
        selectedDate={selectedDate}
        onDateSelect={vi.fn()}
        calendarData={{ [selectedDate]: [activity] }}
        onActivityEdit={onActivityEdit}
        onActivityDelete={onActivityDelete}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: 'Edit watered activity for Tomato' });
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete watered activity for Tomato' });
    const detailEditButton = editButtons.find((button) => button.classList.contains('touch-target'));
    const detailDeleteButton = deleteButtons.find((button) => button.classList.contains('touch-target'));

    expect(detailEditButton).toHaveClass('touch-target');
    expect(detailEditButton.parentElement).toHaveClass('touch-reveal');
    expect(detailDeleteButton).toHaveClass('touch-target');

    await user.click(detailEditButton);
    await user.click(detailDeleteButton);

    expect(onActivityEdit).toHaveBeenCalledWith(activity);
    expect(onActivityDelete).toHaveBeenCalledWith(activity);
  });
});
