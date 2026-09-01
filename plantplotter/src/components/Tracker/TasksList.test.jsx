import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TasksList from './TasksList';

const task = {
  id: 7,
  title: 'Water tomatoes',
  priority: 'medium',
  dueDate: '2026-09-01'
};

describe('TasksList accessibility', () => {
  it('names checkbox and edit actions with their task', async () => {
    const onTaskComplete = vi.fn();
    const onTaskEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <TasksList
        title="Upcoming Tasks"
        tasks={[task]}
        onTaskComplete={onTaskComplete}
        onTaskEdit={onTaskEdit}
        showCheckboxes
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Complete Water tomatoes' }));
    await user.click(screen.getByRole('button', { name: 'Edit Water tomatoes' }));

    expect(onTaskComplete).toHaveBeenCalledWith(7);
    expect(onTaskEdit).toHaveBeenCalledWith(task);
  });

  it('names the icon-only complete button with its task', () => {
    render(
      <TasksList
        title="Overdue Tasks"
        tasks={[task]}
        onTaskComplete={vi.fn()}
        onTaskEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Complete Water tomatoes' })).toBeInTheDocument();
  });
});
