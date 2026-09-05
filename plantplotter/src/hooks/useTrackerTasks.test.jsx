import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { getTodayDateKey } from '@/lib/trackerData';
import useTrackerTasks from './useTrackerTasks';

vi.mock('@/lib/api', () => ({
  default: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
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

  it('completes a task with the mapped payload and refreshes the queues', async () => {
    const today = getTodayDateKey();
    apiClient.getTasks
      .mockResolvedValueOnce([
        {
          id: 9,
          title: 'Water basil',
          due_date: today,
          task_type: 'water',
          status: 'pending',
          notes: 'Use rain barrel'
        }
      ])
      .mockResolvedValueOnce([]);
    apiClient.updateTask.mockResolvedValue({});
    const props = createHookProps();
    const { result } = renderHook(() => useTrackerTasks(props));

    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(9));

    expect(apiClient.updateTask).toHaveBeenCalledWith(9, expect.objectContaining({
      status: 'completed',
      task_type: 'water',
      notes: 'Use rain barrel'
    }));
    expect(result.current.todayTasks).toEqual([]);
    expect(props.showSuccess).toHaveBeenCalledWith('task-complete-9', 'Task completed.');
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
