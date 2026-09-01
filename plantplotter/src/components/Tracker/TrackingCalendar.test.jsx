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
});
