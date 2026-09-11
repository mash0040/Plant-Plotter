import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TrackingCalendar from './TrackingCalendar';
import { getTodayDateKey } from '@/lib/trackerData';

describe('TrackingCalendar accessibility', () => {
  it('collapses the history and individual notes while showing mixed entries newest first', async () => {
    const completedAt = new Date();
    completedAt.setHours(13, 0, 0, 0);
    const date = getTodayDateKey(completedAt);
    const user = userEvent.setup();
    render(<TrackingCalendar selectedDate={date} onDateSelect={vi.fn()}
      completedTasks={[{ id: 3, title: 'Inspect vegetable beds', status: 'completed', completed_at: completedAt.toISOString(), notes: 'Task note' }]}
      calendarData={{ [date]: [
        { id: 1, activity: 'watered', plant: 'Basil', time: '09:00', notes: 'Log note' },
        { id: 2, activity: 'pruned', plant: 'Rose', time: '13:30' }
      ] }} />);
    const section = screen.getByRole('heading', { name: /Activities for.*\(3\)/ }).closest('details');
    const rows = Array.from(section.querySelectorAll(':scope > div > details > summary'));
    expect(rows.map(row => row.textContent)).toEqual([
      expect.stringContaining('Pruned Rose1:30 PM'),
      expect.stringContaining('Inspect vegetable beds1:00 PM'),
      expect.stringContaining('Watered Basil9:00 AM')
    ]);
    expect(screen.getByText('Task note')).not.toBeVisible();
    expect(screen.getByText('Log note')).not.toBeVisible();
    await user.click(rows[1]);
    await user.click(rows[2]);
    expect(screen.getByText('Task note')).toBeVisible();
    expect(screen.getByText('Log note')).toBeVisible();
    expect(screen.getByText('Task note').className).toBe(screen.getByText('Log note').className);
    expect(screen.getByText('Log note')).not.toHaveClass('italic');
    await user.click(section.querySelector('summary'));
    expect(screen.getByText('Task note')).not.toBeVisible();
    expect(screen.getByText('Log note')).not.toBeVisible();
    expect(section).not.toHaveAttribute('open');
  });

  it('shows completed tasks alongside quick logs and opens the task editor with separate actions', async () => {
    const completedAt = new Date();
    const selectedDate = getTodayDateKey(completedAt);
    const task = { id: 12, title: 'Inspect north bed', plant_name: 'North bed',
      notes: 'Leaves healthy\nNo pests', due_date: '2000-01-01', status: 'completed',
      completed_at: completedAt.toISOString() };
    const activity = { id: 12, activity: 'watered', plant: 'Tomato', time: '09:00' };
    const onTaskEdit = vi.fn();
    const onActivityEdit = vi.fn();
    const onActivityDelete = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TrackingCalendar selectedDate={selectedDate} onDateSelect={vi.fn()}
      completedTasks={[task]} calendarData={{ [selectedDate]: [activity] }}
      onTaskEdit={onTaskEdit} onActivityEdit={onActivityEdit} onActivityDelete={onActivityDelete} />);

    expect(screen.getByRole('heading', { name: /Activities for/ })).toBeInTheDocument();
    expect(screen.getByText('Inspect north bed')).toBeVisible();
    expect(screen.getByText('Leaves healthy No pests')).toHaveClass('whitespace-pre-wrap');
    expect(screen.getByText('Completed task · North bed')).toBeVisible();
    expect(screen.getByText('Leaves healthy No pests')).not.toBeVisible();
    await user.click(screen.getByText('Inspect north bed'));
    expect(screen.getByText('Leaves healthy No pests')).toBeVisible();
    const viewButton = screen.getByRole('button', { name: 'View completed task Inspect north bed' });
    expect(viewButton).toHaveClass('touch-target');
    await user.click(viewButton);
    expect(onTaskEdit).toHaveBeenCalledExactlyOnceWith(task);
    expect(onActivityEdit).not.toHaveBeenCalled();
    expect(onActivityDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Delete completed/ })).not.toBeInTheDocument();

    rerender(<TrackingCalendar selectedDate={selectedDate} onDateSelect={vi.fn()} completedTasks={[task]}
      pendingTaskIds={new Set([task.id])} onTaskEdit={onTaskEdit} />);
    expect(screen.getByRole('button', { name: 'View completed task Inspect north bed' })).toBeDisabled();

    rerender(<TrackingCalendar selectedDate="2000-01-01" onDateSelect={vi.fn()} completedTasks={[task]} />);
    expect(screen.queryByRole('heading', { name: /Activities for/ })).not.toBeInTheDocument();
  });

  it('makes undated legacy history accessible without putting it on the due date', async () => {
    const selectedDate = getTodayDateKey();
    const task = { id: 20, title: 'Old maintenance', status: 'completed', due_date: selectedDate, completed_at: null };
    const onTaskEdit = vi.fn();
    const user = userEvent.setup();
    render(<TrackingCalendar selectedDate={selectedDate} onDateSelect={vi.fn()}
      completedTasks={[task]} onTaskEdit={onTaskEdit} />);
    expect(screen.queryByRole('heading', { name: /Activities for/ })).not.toBeInTheDocument();
    await user.click(screen.getByText('Completed tasks without a recorded date (1)'));
    expect(screen.getByText('Completion date not recorded')).toBeVisible();
    expect(screen.getByText('Completed task · Whole garden')).toBeVisible();
    await user.click(screen.getByText('Old maintenance'));
    await user.click(screen.getByRole('button', { name: 'View completed task Old maintenance' }));
    expect(onTaskEdit).toHaveBeenCalledWith(task);
  });

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

    await user.click(screen.getByText('Watered Tomato'));
    const editButtons = screen.getAllByRole('button', { name: 'Edit watered activity for Tomato' });
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete watered activity for Tomato' });
    const detailEditButton = editButtons.find((button) => button.classList.contains('touch-target'));
    const detailDeleteButton = deleteButtons.find((button) => button.classList.contains('touch-target'));

    expect(detailEditButton).toHaveClass('touch-target');
    expect(detailEditButton).toBeVisible();
    expect(detailDeleteButton).toHaveClass('touch-target');

    await user.click(detailEditButton);
    await user.click(detailDeleteButton);

    expect(onActivityEdit).toHaveBeenCalledWith(activity);
    expect(onActivityDelete).toHaveBeenCalledWith(activity);
  });

  it('describes missing activity details without vague unknown labels', () => {
    const today = new Date();
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    render(
      <TrackingCalendar
        selectedDate={selectedDate}
        onDateSelect={vi.fn()}
        calendarData={{
          [selectedDate]: [{
            id: 13,
            activity: 'watered',
            plant: 'Plant not recorded',
            time: ''
          }]
        }}
        onActivityEdit={vi.fn()}
        onActivityDelete={vi.fn()}
      />
    );

    expect(screen.getByTitle('Watered Plant not recorded; time not recorded')).toBeInTheDocument();
    expect(screen.getByText('Time not recorded')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {
      name: 'Edit watered activity for Plant not recorded'
    })).not.toHaveLength(0);
  });

  it('keeps tasks as calendar context without duplicating a selected-date task list', () => {
    const today = new Date();
    const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const task = {
      id: 18,
      title: 'Weed bed',
      description: 'Clear the north edge',
      dueDate: selectedDate,
      task_type: 'weed'
    };

    render(
      <TrackingCalendar
        selectedDate={selectedDate}
        onDateSelect={vi.fn()}
        taskData={{ [selectedDate]: [task] }}
      />
    );

    expect(screen.getAllByText('Weed bed')).toHaveLength(1);
    expect(screen.queryByText('Clear the north edge')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tasks for/)).not.toBeInTheDocument();
  });
});
