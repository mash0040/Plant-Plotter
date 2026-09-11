import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { getTodayDateKey } from '@/lib/trackerData';
import useTrackerTasks from './useTrackerTasks';

vi.mock('@/lib/api', () => ({ default: {
  getTasks: vi.fn(), updateTaskStatus: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn()
} }));

const garden = { id: 4, name: 'Patio' };
const props = () => ({ gardens: [garden], selectedGarden: garden, setSelectedGarden: vi.fn(),
  showError: vi.fn(), showSuccess: vi.fn(), clearFeedback: vi.fn() });
const pending = { id: 1, garden_id: 4, title: 'Inspect north bed', task_type: 'inspect',
  plant_name: 'North bed', notes: 'Check the leaves', due_date: getTodayDateKey(), status: 'pending' };
const completed = { ...pending, status: 'completed', completed_at: '2026-09-11T15:30:00.000Z' };
const previous = { ...completed, id: 2, title: 'Water herbs' };

beforeEach(() => vi.resetAllMocks());

describe('task history mutations', () => {
  it('keeps old and newly completed history when refresh fails, including after a fresh mount', async () => {
    const hookProps = props();
    apiClient.getTasks.mockResolvedValueOnce([pending, previous]).mockRejectedValueOnce(new Error('Offline'));
    apiClient.updateTaskStatus.mockResolvedValue(completed);
    const hook = renderHook(() => useTrackerTasks(hookProps));
    await act(async () => hook.result.current.loadTasks());
    await act(async () => hook.result.current.completeTask(1));
    expect(hook.result.current.todayTasks).toEqual([]);
    expect(hook.result.current.completedTasks).toEqual(expect.arrayContaining([
      expect.objectContaining(completed), expect.objectContaining(previous)
    ]));
    expect(hook.result.current.completedTasks).toHaveLength(2);
    expect(hookProps.showError).toHaveBeenCalledWith('tasks-load', expect.any(String));
    await act(async () => hook.result.current.completeTask(1));
    expect(apiClient.updateTaskStatus).toHaveBeenCalledTimes(1);
    hook.unmount();

    apiClient.getTasks.mockResolvedValue([completed, previous]);
    const fresh = renderHook(() => useTrackerTasks(hookProps));
    await act(async () => fresh.result.current.loadTasks());
    expect(fresh.result.current.completedTasks).toHaveLength(2);
    expect(fresh.result.current.completedTasks[0].completed_at).toBe(completed.completed_at);
  });

  it('uses the updated plant label when reopening a just-completed task without a successful refresh', async () => {
    apiClient.getTasks.mockResolvedValueOnce([pending]).mockRejectedValue(new Error('Offline'));
    apiClient.updateTaskStatus.mockResolvedValue(completed);
    apiClient.updateTask.mockResolvedValue({ ...pending, plant_name: 'South bed', completed_at: null });
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(1));
    await act(async () => result.current.saveTask({ ...result.current.completedTasks[0],
      plant_name: 'South bed', status: 'pending' }));
    expect(result.current.completedTasks).toEqual([]);
    expect(result.current.todayTasks[0]).toMatchObject({ plant_name: 'South bed', plant: 'South bed' });
  });

  it('retains each recurring occurrence while the next one remains pending', async () => {
    const recurring = { ...pending, is_recurring: true, recurring_pattern: 'daily' };
    const done = { ...recurring, status: 'completed', completed_at: completed.completed_at };
    const next = { ...recurring, id: 3, due_date: '2099-01-01' };
    apiClient.getTasks.mockResolvedValueOnce([recurring]).mockResolvedValueOnce([done, next]);
    apiClient.updateTaskStatus.mockResolvedValue(done);
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(1));
    expect(result.current.completedTasks.map(task => task.id)).toEqual([1]);
    expect(result.current.upcomingTasks.map(task => task.id)).toEqual([3]);
    expect(result.current.calendarTasks['2099-01-01'][0].id).toBe(3);
  });

  it('does not create history for a failed completion', async () => {
    apiClient.getTasks.mockResolvedValue([pending, previous]);
    apiClient.updateTaskStatus.mockRejectedValue(new Error('Offline'));
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.completeTask(1));
    expect(result.current.todayTasks.map(task => task.id)).toEqual([1]);
    expect(result.current.completedTasks.map(task => task.id)).toEqual([2]);
  });

  it('shows completion through the editor and removes history on reopening even if refresh fails', async () => {
    apiClient.getTasks.mockResolvedValueOnce([pending]).mockRejectedValue(new Error('Offline'));
    apiClient.updateTask.mockResolvedValueOnce(completed)
      .mockResolvedValueOnce({ ...pending, plant_name: 'South bed', completed_at: null });
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.saveTask({ ...pending, status: 'completed' }));
    expect(result.current.completedTasks[0].completed_at).toBe(completed.completed_at);
    await act(async () => result.current.saveTask({ ...result.current.completedTasks[0], plant_name: 'South bed', status: 'pending' }));
    expect(result.current.completedTasks).toEqual([]);
    expect(result.current.todayTasks.map(task => task.id)).toEqual([1]);
    expect(result.current.todayTasks[0].plant).toBe('South bed');
  });

  it('updates notes without moving history and removes a confirmed deletion despite refresh failure', async () => {
    apiClient.getTasks.mockResolvedValueOnce([completed, previous]).mockRejectedValue(new Error('Offline'));
    apiClient.updateTask.mockResolvedValue({ ...completed, notes: 'All healthy' });
    apiClient.deleteTask.mockResolvedValue({});
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    await act(async () => result.current.saveTask({ ...result.current.completedTasks[0], notes: 'All healthy' }));
    expect(result.current.completedTasks.find(task => task.id === 1)).toMatchObject({
      notes: 'All healthy', completed_at: completed.completed_at
    });
    await act(async () => result.current.deleteTask(1));
    expect(result.current.completedTasks.map(task => task.id)).toEqual([2]);
  });

  it('ignores a stale read after completion even when the new refresh fails', async () => {
    let resolveOldRead;
    apiClient.getTasks.mockResolvedValueOnce([pending])
      .mockReturnValueOnce(new Promise(resolve => { resolveOldRead = resolve; }))
      .mockRejectedValueOnce(new Error('Offline'));
    apiClient.updateTaskStatus.mockResolvedValue(completed);
    const { result } = renderHook(() => useTrackerTasks(props()));
    await act(async () => result.current.loadTasks());
    let oldRead;
    act(() => { oldRead = result.current.loadTasks(); });
    await act(async () => result.current.completeTask(1));
    await act(async () => { resolveOldRead([pending]); await oldRead; });
    expect(result.current.completedTasks.map(task => task.id)).toEqual([1]);
    expect(result.current.todayTasks).toEqual([]);
  });

  it('clears history on garden changes and ignores late completion responses', async () => {
    let resolveCompletion;
    apiClient.getTasks.mockResolvedValue([pending, previous]);
    apiClient.updateTaskStatus.mockReturnValueOnce(new Promise(resolve => { resolveCompletion = resolve; }));
    const hookProps = props();
    const { result, rerender } = renderHook(options => useTrackerTasks(options), { initialProps: hookProps });
    await act(async () => result.current.loadTasks());
    expect(result.current.completedTasks).toHaveLength(1);
    let request;
    act(() => { request = result.current.completeTask(1); });
    rerender({ ...hookProps, selectedGarden: { id: 5, name: 'Backyard' } });
    expect(result.current.completedTasks).toEqual([]);
    await act(async () => { resolveCompletion(completed); await request; });
    expect(result.current.completedTasks).toEqual([]);
    expect(hookProps.showSuccess).not.toHaveBeenCalled();
  });
});
