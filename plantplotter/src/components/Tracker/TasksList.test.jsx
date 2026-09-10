import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TasksList from './TasksList';
import { getGardenName } from './Constants/TaskData';

const task = {
  id: 7,
  title: 'Water tomatoes',
  priority: 'medium',
  dueDate: '2026-09-01'
};

describe('task display data', () => {
  it('labels a missing garden reference contextually', () => {
    expect(getGardenName(-1)).toBe('Garden unavailable');
  });
});

describe('TasksList accessibility', () => {
  it.each(['Today', 'Overdue', 'Upcoming'])('uses named completion and edit buttons in %s', async title => {
    const onTaskComplete = vi.fn();
    const onTaskEdit = vi.fn();
    const user = userEvent.setup();

    render(
      <TasksList
        title={title}
        tasks={[task]}
        onTaskComplete={onTaskComplete}
        onTaskEdit={onTaskEdit}
      />
    );

    const completeButton = screen.getByRole('button', { name: 'Complete Water tomatoes' });
    const editButton = screen.getByRole('button', { name: 'Edit Water tomatoes' });

    expect(completeButton).toHaveClass('touch-target');
    expect(editButton).toHaveClass('touch-target', 'touch-reveal');

    await user.click(completeButton);
    await user.click(editButton);

    expect(onTaskComplete).toHaveBeenCalledWith(7);
    expect(onTaskEdit).toHaveBeenCalledWith(task);
  });

  it.each(['Today', 'Overdue', 'Upcoming'])('disables only the pending task in %s and allows retry after failure', async title => {
    const user = userEvent.setup();
    const onTaskComplete = vi.fn();
    const props = { title, tasks: [task, { ...task, id: 8, title: 'Weed beds' }],
      onTaskComplete, onTaskEdit: vi.fn() };
    const { rerender } = render(<TasksList {...props} pendingTaskIds={new Set([7])} />);
    const button = screen.getByRole('button', { name: 'Complete Water tomatoes' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Completing task...');
    expect(screen.getByRole('button', { name: 'Edit Water tomatoes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Complete Weed beds' })).toBeEnabled();
    await user.dblClick(button);
    expect(onTaskComplete).not.toHaveBeenCalled();
    rerender(<TasksList {...props} pendingTaskIds={new Set()} />);
    expect(button).toBeEnabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(button);
    expect(onTaskComplete).toHaveBeenCalledExactlyOnceWith(7);
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

  it('uses the same readable label for legacy every-2-days tasks', () => {
    render(
      <TasksList
        title="Today"
        tasks={[{
          ...task,
          isRecurring: true,
          recurringPattern: 'every-2-days'
        }]}
        onTaskComplete={vi.fn()}
        onTaskEdit={vi.fn()}
      />
    );

    expect(screen.getByText('Recurring (Every 2 days)')).toBeInTheDocument();
  });
});
