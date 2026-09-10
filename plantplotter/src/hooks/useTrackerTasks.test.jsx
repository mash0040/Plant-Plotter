import { useEffect } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { getTodayDateKey } from '@/lib/trackerData';
import useTrackerTasks from './useTrackerTasks';
import useTrackerFeedback from './useTrackerFeedback';
import TasksList from '@/components/Tracker/TasksList';

vi.mock('@/lib/api', () => ({
  default: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
    getPlantLibrary: vi.fn()
  }
}));

const selectedGarden = { id: 4, name: 'Patio', hasLoadedPlants: true };

const createHookProps = () => ({
  gardens: [selectedGarden],
  selectedGarden,
  setSelectedGarden: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  clearFeedback: vi.fn()
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTrackerTasks', () => {
  it.each([
    ['Today', 'todayTasks', () => getTodayDateKey()],
    ['Overdue', 'overdueTasks', () => '2000-01-01'],
    ['Upcoming', 'upcomingTasks', () => '2099-01-01']
  ])('handles duplicate clicks, failure and successful retry through the %s control', async (title, collection, dueDate) => {
    const props = createHookProps();
    const task = { id: 9, title: 'Water basil', due_date: dueDate(), status: 'pending' };
    apiClient.getTasks.mockResolvedValue([task]);
    let rejectCompletion;
    apiClient.updateTaskStatus.mockReturnValueOnce(new Promise((resolve, reject) => { rejectCompletion = reject; }));
    function TaskQueue() {
      const feedback = useTrackerFeedback();
      const tasks = useTrackerTasks({ ...props, ...feedback });
      const { loadTasks } = tasks;
      useEffect(() => { loadTasks(); }, [loadTasks]);
      return <>
        {feedback.feedback && <p role="alert">{feedback.feedback.message}</p>}
        <TasksList title={title} tasks={tasks[collection]} onTaskComplete={tasks.completeTask}
          pendingTaskIds={tasks.pendingTaskIds} collapsible={title === 'Upcoming'} />
      </>;
    }
    const user = userEvent.setup();
    render(<TaskQueue />);
    await screen.findByText('Water basil');
    if (title === 'Upcoming') await user.click(screen.getByText('Upcoming'));
    const button = screen.getByRole('button', { name: 'Complete Water basil' });
    await user.dblClick(button);
    expect(apiClient.updateTaskStatus).toHaveBeenCalledExactlyOnceWith(9, 'completed');
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Completing task...');
    await act(async () => rejectCompletion(new Error('Offline')));
    expect(button).toBeEnabled();
    expect(screen.getByText('Water basil')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Try completing it again.');
    apiClient.updateTaskStatus.mockResolvedValue({ ...task, status: 'completed' });
    apiClient.getTasks.mockResolvedValue([]);
    await user.click(button);
    await waitFor(() => expect(screen.queryByText('Water basil')).not.toBeInTheDocument());
    expect(apiClient.updateTaskStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Task completed.');
  });

  it('loads and groups tasks for the selected garden', async () => {
    const today = getTodayDateKey();
    apiClient.getTasks.mockResolvedValue([
      { id: 1, title: 'Water basil', due_date: today, status: 'pending' },
      { id: 2, title: 'Finished', due_date: today, status: 'completed' }
    ]);
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.loadTasks());

    expect(apiClient.getTasks).toHaveBeenCalledWith(4);
    expect(result.current.todayTasks.map(task => task.id)).toEqual([1]);
    expect(result.current.calendarTasks[today].map(task => task.id)).toEqual([1]);
    expect(props.clearFeedback).toHaveBeenCalledWith('tasks-load');
  });

  it('completes a task without resubmitting unrelated legacy metadata and refreshes the queues', async () => {
    const today = getTodayDateKey();
    apiClient.getTasks
      .mockResolvedValueOnce([
        {
          id: 9,
          title: 'Water basil',
          due_date: today,
          task_type: 'legacy-type',
          status: 'pending',
          notes: 'Use rain barrel'
        }
      ])
      .mockResolvedValueOnce([]);
    apiClient.updateTaskStatus.mockResolvedValue({ id: 9, status: 'completed' });
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(9));

    expect(apiClient.updateTaskStatus).toHaveBeenCalledWith(9, 'completed');
    expect(apiClient.updateTask).not.toHaveBeenCalled();
    expect(result.current.todayTasks).toEqual([]);
    expect(props.showSuccess).toHaveBeenCalledWith('task-complete-9', 'Task completed.');
  });

  it('blocks same-tick duplicate completion requests but allows different tasks', async () => {
    const today = getTodayDateKey();
    apiClient.getTasks.mockResolvedValue([
      { id: 1, title: 'Water', due_date: today },
      { id: 2, title: 'Weed', due_date: today }
    ]);
    let finish;
    apiClient.updateTaskStatus.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(() => useTrackerTasks(createHookProps()));
    await act(async () => result.current.loadTasks());
    let first;
    let second;
    act(() => {
      first = result.current.completeTask(1);
      result.current.completeTask(1);
      second = result.current.completeTask(2);
    });
    expect(apiClient.updateTaskStatus).toHaveBeenCalledTimes(2);
    expect(result.current.pendingTaskIds).toEqual(new Set([1, 2]));
    expect(result.current.todayTasks).toHaveLength(2);
    apiClient.getTasks.mockResolvedValue([]);
    await act(async () => { finish({}); await Promise.all([first, second]); });
    expect(result.current.pendingTaskIds.size).toBe(0);
    expect(result.current.todayTasks).toEqual([]);
  });

  it('keeps failed tasks pending and permits an explicit retry', async () => {
    apiClient.getTasks.mockResolvedValue([{ id: 1, title: 'Water', due_date: getTodayDateKey() }]);
    apiClient.updateTaskStatus.mockRejectedValueOnce(new Error('Offline'));
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(1));
    expect(result.current.todayTasks[0].status).toBe('pending');
    expect(result.current.pendingTaskIds.size).toBe(0);
    expect(apiClient.getTasks).toHaveBeenCalledTimes(1);
    expect(apiClient.updateTaskStatus).toHaveBeenCalledTimes(1);
    expect(props.showSuccess).not.toHaveBeenCalled();
    expect(props.showError).toHaveBeenCalledWith('task-complete-1', expect.stringContaining('Try completing it again.'));
    apiClient.updateTaskStatus.mockResolvedValue({});
    apiClient.getTasks.mockResolvedValue([]);
    await act(async () => result.current.completeTask(1));
    expect(apiClient.updateTaskStatus).toHaveBeenCalledTimes(2);
    expect(result.current.todayTasks).toEqual([]);
  });

  it('preserves other tasks and the confirmed completion when refreshing fails', async () => {
    apiClient.getTasks.mockResolvedValueOnce([
      { id: 1, title: 'Water', due_date: getTodayDateKey() },
      { id: 2, title: 'Weed', due_date: getTodayDateKey() }
    ]).mockRejectedValueOnce(new Error('Offline'));
    apiClient.updateTaskStatus.mockResolvedValue({});
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(1));
    expect(result.current.todayTasks.map(task => task.id)).toEqual([2]);
    expect(props.showError).toHaveBeenCalledWith('tasks-load', expect.stringContaining('out of date'));
    expect(result.current.pendingTaskIds.size).toBe(0);
  });

  it('does not apply completion feedback or a refresh to a newly selected garden', async () => {
    apiClient.getTasks.mockResolvedValue([{ id: 1, title: 'Water', due_date: getTodayDateKey() }]);
    let finish;
    apiClient.updateTaskStatus.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const props = createHookProps();
    const { result, rerender } = renderHook(options => useTrackerTasks(options), { initialProps: props });
    await act(async () => result.current.loadTasks());
    let completion;
    act(() => { completion = result.current.completeTask(1); });
    rerender({ ...props, selectedGarden: { id: 8 } });
    await act(async () => { finish({}); await completion; });
    expect(props.showSuccess).not.toHaveBeenCalled();
    expect(apiClient.getTasks).toHaveBeenCalledTimes(1);
    expect(result.current.todayTasks).toEqual([]);
    expect(result.current.pendingTaskIds.size).toBe(0);
  });

  it('loads and reuses the task plant library', async () => {
    apiClient.getPlantLibrary.mockResolvedValue([{ id: 3, name: 'Basil' }]);
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.loadTaskPlantLibrary());
    await act(async () => result.current.loadTaskPlantLibrary());

    expect(apiClient.getPlantLibrary).toHaveBeenCalledTimes(1);
    expect(result.current.taskPlantLibrary).toEqual([{ id: 3, name: 'Basil' }]);
    expect(result.current.taskPlantLibraryError).toBe('');
  });

  it('preserves task CRUD payloads and refreshes the selected garden queues', async () => {
    apiClient.updateTask.mockResolvedValue({});
    apiClient.createTask.mockResolvedValue({ id: 14 });
    apiClient.deleteTask.mockResolvedValue({});
    apiClient.getTasks.mockResolvedValue([]);
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.saveTask({
      id: 11,
      title: 'Water basil',
      garden_id: 4,
      due_date: '2026-09-06',
      task_type: 'water',
      status: 'pending'
    }));
    await act(async () => result.current.saveTask({
      title: 'Inspect leaves',
      garden_id: 4,
      due_date: '2026-09-07',
      task_type: 'inspect',
      recurring_pattern: 'none'
    }));
    await act(async () => result.current.deleteTask(11));

    expect(apiClient.updateTask).toHaveBeenCalledWith(11, expect.objectContaining({
      due_date: '2026-09-06',
      task_type: 'water'
    }));
    expect(apiClient.createTask).toHaveBeenCalledWith(expect.objectContaining({
      garden_id: 4,
      task_type: 'inspect',
      is_recurring: false
    }));
    expect(apiClient.deleteTask).toHaveBeenCalledWith(11);
    expect(apiClient.getTasks).toHaveBeenCalledTimes(3);
    expect(props.showSuccess).toHaveBeenCalledWith('task-update', 'Task updated.');
    expect(props.showSuccess).toHaveBeenCalledWith('task-create', 'Task created.');
    expect(props.showSuccess).toHaveBeenCalledWith('task-delete', 'Task deleted.');
  });

  it('selects a task target garden so the page can load its tracker data', async () => {
    apiClient.createTask.mockResolvedValue({ id: 18 });
    const targetGarden = { id: 8, name: 'Herbs', hasLoadedPlants: true };
    const props = {
      ...createHookProps(),
      gardens: [selectedGarden, targetGarden]
    };
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.saveTask({
      title: 'Prune mint',
      garden_id: 8,
      due_date: '2026-09-08',
      task_type: 'prune'
    }));

    expect(props.setSelectedGarden).toHaveBeenCalledWith(targetGarden);
    expect(apiClient.getTasks).not.toHaveBeenCalled();
  });
});
