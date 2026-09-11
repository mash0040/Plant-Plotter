import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import useTrackerActivities from '@/hooks/useTrackerActivities';
import useTrackerFeedback from '@/hooks/useTrackerFeedback';
import ActivityModal from './ActivityModal';
import QuickActions from './QuickActions';

vi.mock('@/lib/api', () => ({ default: { addActivity: vi.fn() } }));

const garden = { id: 7, name: 'Kitchen garden', plantedItems: [{ name: 'Tomato' }, { name: 'Basil' }] };
const draft = { activity: 'planted', plant: '', notes: '' };
const savedActivity = { id: 15, garden_id: 7, activity_type: 'planted', plant_name: 'Basil',
  notes: 'Near the fence', activity_date: '2026-09-04', activity_time: '23:58:00' };

beforeEach(() => { vi.resetAllMocks(); });

// Real modal, activity hook and feedback, using the page's success-only close flow.
function QuickLog({ onSaved }) {
  const [formData, setFormData] = useState(draft);
  const [isOpen, setIsOpen] = useState(true);
  const feedback = useTrackerFeedback();
  const { addQuickActivity, calendarData } = useTrackerActivities({ selectedGarden: garden, ...feedback });
  const submit = async data => {
    const saved = await addQuickActivity(data, '2026-09-05');
    if (!saved) return;
    onSaved(saved);
    setIsOpen(false);
    setFormData(draft);
  };
  return <>
    {feedback.feedback && <p role="status">{feedback.feedback.message}</p>}
    {isOpen && <ActivityModal isOpen formData={formData} onFormDataChange={setFormData}
      onSubmit={submit} onClose={() => setIsOpen(false)} selectedGarden={garden} />}
    <output aria-label="Calendar entries">{JSON.stringify(calendarData)}</output>
  </>;
}

describe('Quick Log recovery', () => {
  it('preserves the draft on failure, shows one inline error and adds one authoritative entry after retry', async () => {
    apiClient.addActivity.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(savedActivity);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<QuickLog onSaved={onSaved} />);
    await user.selectOptions(screen.getByLabelText('Plant'), 'Basil');
    await user.type(screen.getByLabelText('Notes (optional)'), 'Near the fence');
    fireEvent.change(screen.getByLabelText('Time performed (optional)'), { target: { value: '09:15' } });
    await user.click(screen.getByRole('button', { name: 'Add Activity' }));

    const dialog = screen.getByRole('dialog', { name: 'Log Planted' });
    expect(within(dialog).getByLabelText('Plant')).toHaveValue('Basil');
    expect(within(dialog).getByLabelText('Notes (optional)')).toHaveValue('Near the fence');
    expect(within(dialog).getByLabelText('Time performed (optional)')).toHaveValue('09:15');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Your selections and notes are still here.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Activity logged.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Calendar entries')).toHaveTextContent('{}');
    expect(onSaved).not.toHaveBeenCalled();
    expect(apiClient.addActivity).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSaved).toHaveBeenCalledExactlyOnceWith(savedActivity);
    expect(apiClient.addActivity).toHaveBeenCalledTimes(2);
    expect(apiClient.addActivity.mock.calls[0][0]).toEqual(apiClient.addActivity.mock.calls[1][0]);
    expect(apiClient.addActivity.mock.calls[1][0].activity_time).toBe('09:15');
    const calendar = JSON.parse(screen.getByLabelText('Calendar entries').textContent);
    expect(Object.values(calendar).flat()).toHaveLength(1);
    expect(calendar['2026-09-04'][0]).toMatchObject({ id: 15, time: '23:58', plant: 'Basil', notes: 'Near the fence' });
  });

  it('closes after the first successful save', async () => {
    apiClient.addActivity.mockResolvedValue(savedActivity);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<QuickLog onSaved={onSaved} />);
    await user.selectOptions(screen.getByLabelText('Plant'), 'Basil');
    await user.click(screen.getByRole('button', { name: 'Add Activity' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(apiClient.addActivity).toHaveBeenCalledTimes(1);
    expect(apiClient.addActivity.mock.calls[0][0].activity_time).toBeNull();
  });

  it('blocks same-tick form submissions and prevents draft changes or dismissal while saving', async () => {
    let finish;
    const onSubmit = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onClose = vi.fn();
    render(<ActivityModal isOpen formData={{ ...draft, plant: 'Basil' }} onFormDataChange={vi.fn()}
      onSubmit={onSubmit} onClose={onClose} selectedGarden={garden} />);
    const button = screen.getByRole('button', { name: 'Add Activity' });
    act(() => {
      fireEvent.submit(button.closest('form'));
      fireEvent.submit(button.closest('form'));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled();
    expect(screen.getByLabelText('Plant')).toBeDisabled();
    expect(screen.getByLabelText('Notes (optional)')).toBeDisabled();
    expect(screen.getByLabelText('Time performed (optional)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => finish(savedActivity));
  });

  it('requires an explicit current plant and explains planting history', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<ActivityModal isOpen formData={draft} onFormDataChange={vi.fn()}
      onSubmit={onSubmit} onClose={vi.fn()} selectedGarden={garden} />);
    expect(screen.getByRole('button', { name: 'Add Activity' })).toBeDisabled();
    expect(screen.getByText(/To add a plant to your layout, use the garden planner/)).toBeVisible();
    rerender(<ActivityModal isOpen formData={{ ...draft, plant: 'Unknown plant' }} onFormDataChange={vi.fn()}
      onSubmit={onSubmit} onClose={vi.fn()} selectedGarden={garden} />);
    fireEvent.submit(screen.getByRole('button', { name: 'Add Activity' }).closest('form'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('labels the Planted quick action as planting history', async () => {
    const user = userEvent.setup();
    const onQuickAction = vi.fn();
    render(<QuickActions selectedGarden={garden} onQuickAction={onQuickAction} />);
    await user.click(screen.getByRole('button', { name: 'Planted Record planting history' }));
    expect(onQuickAction).toHaveBeenCalledExactlyOnceWith('planted');
  });
});
