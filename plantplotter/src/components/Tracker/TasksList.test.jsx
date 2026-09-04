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
        title="Upcoming"
        tasks={[task]}
        onTaskComplete={onTaskComplete}
        onTaskEdit={onTaskEdit}
        showCheckboxes
      />
    );

    const completeCheckbox = screen.getByRole('checkbox', { name: 'Complete Water tomatoes' });
    const editButton = screen.getByRole('button', { name: 'Edit Water tomatoes' });

    expect(completeCheckbox.closest('label')).toHaveClass('touch-target');
    expect(editButton).toHaveClass('touch-target', 'touch-reveal');

    await user.click(completeCheckbox);
    await user.click(editButton);

    expect(onTaskComplete).toHaveBeenCalledWith(7);
    expect(onTaskEdit).toHaveBeenCalledWith(task);
  });

  it('names the icon-only complete button with its task', () => {
    render(
      <TasksList
        title="Overdue"
        tasks={[task]}
        onTaskComplete={vi.fn()}
        onTaskEdit={vi.fn()}
        tone="urgent"
      />
    );

    expect(screen.getByRole('button', { name: 'Complete Water tomatoes' })).toHaveClass('touch-target');
    expect(screen.getByText('Overdue')).toHaveClass('text-red-700', 'dark:text-red-300');
    expect(screen.getByText('Water tomatoes')).toHaveClass('dark:text-white');
    expect(screen.getByText('medium')).toHaveClass('dark:bg-amber-950', 'dark:text-amber-200');
  });

  it('keeps upcoming tasks collapsed until requested', async () => {
    const user = userEvent.setup();

    render(
      <TasksList
        title="Upcoming"
        tasks={[task]}
        onTaskComplete={vi.fn()}
        onTaskEdit={vi.fn()}
        collapsible
      />
    );

    const summary = screen.getByText('Upcoming').closest('summary');
    const disclosure = summary.closest('details');

    expect(screen.getByText('Upcoming')).toHaveClass('dark:text-white');
    expect(disclosure).not.toHaveAttribute('open');
    expect(screen.getByText('Water tomatoes')).not.toBeVisible();

    await user.click(summary);

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText('Water tomatoes')).toBeVisible();
  });

  it('uses a quiet empty state without adding another create action', () => {
    render(
      <TasksList
        title="Today"
        tasks={[]}
        onTaskComplete={vi.fn()}
        onTaskEdit={vi.fn()}
        emptyMessage="Nothing due today"
      />
    );

    expect(screen.getByText('Nothing due today')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new task' })).not.toBeInTheDocument();
    expect(screen.queryByText('All Done!')).not.toBeInTheDocument();
  });
});
