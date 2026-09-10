import React, { useEffect } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { getTodayDateKey } from '@/lib/trackerData';
import useTrackerActivities from './useTrackerActivities';
import useTrackerFeedback from './useTrackerFeedback';
import useTrackerGardens from './useTrackerGardens';
import useTrackerTasks from './useTrackerTasks';

vi.mock('@/lib/api', () => ({
  default: {
    getGardenSummaries: vi.fn(),
    getGardenPlants: vi.fn(),
    getTasks: vi.fn(),
    getActivities: vi.fn(),
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn()
  }
}));

const gardenA = { id: 1, name: 'Herbs', plant_count: 1 };
const gardenB = { id: 2, name: 'Vegetables', plant_count: 1 };
const today = getTodayDateKey();
const plantsFor = gardenId => [{ id: gardenId, name: `Plant ${gardenId}` }];
const tasksFor = gardenId => [{
  id: gardenId, garden_id: gardenId, title: `Water plant ${gardenId}`,
  due_date: today, status: 'pending'
}];
const activitiesFor = gardenId => [{
  id: gardenId, garden_id: gardenId, plant_name: `Plant ${gardenId}`,
  activity_type: 'watered', activity_date: today
}];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

// Exercise the same loading orchestration as the tracker page with real feedback.
function useTracker() {
  const feedback = useTrackerFeedback();
  const gardens = useTrackerGardens(feedback);
  const activities = useTrackerActivities({ ...gardens, ...feedback });
  const tasks = useTrackerTasks({ ...gardens, ...feedback });
  const { selectedGarden, loadSelectedGardenPlants } = gardens;
  const { loadActivities } = activities;
  const { loadTasks } = tasks;

  useEffect(() => {
    if (selectedGarden?.hasLoadedPlants) {
      loadTasks();
      loadActivities();
    } else if (selectedGarden) {
      loadSelectedGardenPlants();
    }
  }, [loadActivities, loadSelectedGardenPlants, loadTasks, selectedGarden]);

  return { ...gardens, ...activities, ...tasks, ...feedback };
}

async function selectGarden(result, id) {
  await act(async () => result.current.setSelectedGarden(
    result.current.gardens.find(garden => garden.id === id)
  ));
}

const resources = [
  {
    name: 'plants', method: 'getGardenPlants', response: plantsFor,
    read: tracker => tracker.selectedGarden?.plantedItems,
    load: tracker => tracker.loadSelectedGardenPlants(),
    context: 'plants-load'
  },
  {
    name: 'tasks', method: 'getTasks', response: tasksFor,
    read: tracker => tracker.todayTasks,
    load: tracker => tracker.loadTasks(),
    context: 'tasks-load'
  },
  {
    name: 'activities', method: 'getActivities', response: activitiesFor,
    read: tracker => tracker.calendarData[today] || [],
    load: tracker => tracker.loadActivities(),
    context: 'activities-load'
  }
];

beforeEach(() => {
  vi.resetAllMocks();
  apiClient.getGardenSummaries.mockResolvedValue([gardenA, gardenB]);
  apiClient.getGardenPlants.mockImplementation(async id => plantsFor(id));
  apiClient.getTasks.mockImplementation(async id => tasksFor(id));
  apiClient.getActivities.mockImplementation(async id => activitiesFor(id));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe.each(resources)('tracker $name requests', resource => {
  it('ignores an out-of-order response after switching gardens', async () => {
    const oldRequest = deferred();
    apiClient[resource.method].mockImplementation(id => (
      id === 1 ? oldRequest.promise : Promise.resolve(resource.response(id))
    ));
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));

    await selectGarden(result, 2);
    await waitFor(() => expect(resource.read(result.current).map(item => item.id)).toEqual([2]));
    await act(async () => oldRequest.resolve(resource.response(1)));

    expect(result.current.selectedGarden.id).toBe(2);
    expect(resource.read(result.current).map(item => item.id)).toEqual([2]);
    expect(result.current.calendarTasks[today].map(task => task.garden_id)).toEqual([2]);
    expect(result.current.feedback).toBeNull();
  });

  it.each(['success', 'failure'])('preserves the active error after a late %s', async outcome => {
    const oldRequest = deferred();
    const activeRequest = deferred();
    apiClient[resource.method].mockImplementation(id => id === 1 ? oldRequest.promise : activeRequest.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));
    await selectGarden(result, 2);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(2));
    await act(async () => activeRequest.reject(new Error('Current garden failure')));
    const activeFeedback = result.current.feedback;
    expect(activeFeedback?.context).toBe(resource.context);

    await act(async () => {
      if (outcome === 'success') oldRequest.resolve(resource.response(1));
      else oldRequest.reject(new Error('Previous garden failure'));
    });

    expect(result.current.feedback).toEqual(activeFeedback);
    expect(resource.read(result.current)).toEqual([]);
    expect(result.current.selectedGarden.id).toBe(2);
  });

  it('does not show an error for a superseded failure after the active request succeeds', async () => {
    const oldRequest = deferred();
    apiClient[resource.method].mockImplementation(id => (
      id === 1 ? oldRequest.promise : Promise.resolve(resource.response(id))
    ));
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));
    await selectGarden(result, 2);
    await waitFor(() => expect(resource.read(result.current).map(item => item.id)).toEqual([2]));
    await act(async () => oldRequest.reject(new Error('Previous garden failure')));

    expect(resource.read(result.current).map(item => item.id)).toEqual([2]);
    expect(result.current.feedback).toBeNull();
  });

  it('ignores a response from an earlier visit to the same garden', async () => {
    const oldRequest = deferred();
    apiClient[resource.method].mockImplementationOnce(() => oldRequest.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));
    await selectGarden(result, 2);
    await waitFor(() => expect(resource.read(result.current).map(item => item.id)).toEqual([2]));
    await selectGarden(result, 1);
    await waitFor(() => expect(resource.read(result.current).map(item => item.id)).toEqual([1]));
    await act(async () => oldRequest.resolve(resource.response(99)));

    expect(resource.read(result.current).map(item => item.id)).toEqual([1]);
    expect(result.current.feedback).toBeNull();
  });

  it('keeps the newest request for the same selection', async () => {
    const oldRequest = deferred();
    apiClient[resource.method].mockImplementationOnce(() => oldRequest.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));
    await act(async () => resource.load(result.current));
    await waitFor(() => expect(resource.read(result.current).map(item => item.id)).toEqual([1]));
    await act(async () => oldRequest.resolve(resource.response(99)));

    expect(resource.read(result.current).map(item => item.id)).toEqual([1]);
  });

  it('ignores failures after unmount', async () => {
    const pendingRequest = deferred();
    apiClient[resource.method].mockImplementationOnce(() => pendingRequest.promise);
    const { unmount } = renderHook(useTracker);
    await waitFor(() => expect(apiClient[resource.method]).toHaveBeenCalledWith(1));
    unmount();
    await act(async () => pendingRequest.reject(new Error('Unmounted')));
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('tracker garden transitions', () => {
  it.each([
    { method: 'updateActivity', save: tracker => tracker.saveActivity({ id: 1 }) },
    { method: 'deleteActivity', save: tracker => tracker.deleteActivity(1) },
    { method: 'updateTask', save: tracker => tracker.saveTask({ id: 1 }) },
    { method: 'deleteTask', save: tracker => tracker.deleteTask(1) }
  ])('does not surface a late $method error in the next garden', async ({ method, save }) => {
    const pendingSave = deferred();
    apiClient[method].mockReturnValueOnce(pendingSave.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(result.current.todayTasks).toHaveLength(1));
    let saving;
    act(() => { saving = save(result.current); });
    await selectGarden(result, 2);
    await act(async () => {
      result.current.showError('current-action', 'Current garden error');
    });
    await act(async () => {
      pendingSave.reject(new Error('Previous garden save failed'));
      await expect(saving).resolves.toBeUndefined();
    });
    expect(result.current.feedback.message).toBe('Current garden error');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('hides previous records immediately while the next garden is loading', async () => {
    const pendingPlants = deferred();
    const pendingTasks = deferred();
    const pendingActivities = deferred();
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(result.current.todayTasks).toHaveLength(1));
    apiClient.getGardenPlants.mockReturnValueOnce(pendingPlants.promise);
    apiClient.getTasks.mockReturnValueOnce(pendingTasks.promise);
    apiClient.getActivities.mockReturnValueOnce(pendingActivities.promise);

    await selectGarden(result, 2);
    expect(result.current.selectedGarden.plantedItems).toEqual([]);
    expect(result.current.isLoadingSelectedGardenPlants).toBe(true);
    expect(result.current.todayTasks).toEqual([]);
    expect(result.current.upcomingTasks).toEqual([]);
    expect(result.current.overdueTasks).toEqual([]);
    expect(result.current.calendarTasks).toEqual({});
    expect(result.current.calendarData).toEqual({});

    await act(async () => pendingPlants.resolve(plantsFor(2)));
    expect(result.current.isLoadingSelectedGardenPlants).toBe(false);
    expect(result.current.todayTasks).toEqual([]);
    expect(result.current.calendarData).toEqual({});
    await act(async () => {
      pendingTasks.resolve(tasksFor(2));
      pendingActivities.resolve(activitiesFor(2));
    });
    expect(result.current.todayTasks[0].garden_id).toBe(2);
    expect(result.current.calendarData[today][0].garden_id).toBe(2);
  });

  it('does not let old plant requests end the active loading indicator', async () => {
    const oldPlants = deferred();
    const activePlants = deferred();
    apiClient.getGardenPlants.mockImplementation(id => id === 1 ? oldPlants.promise : activePlants.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(apiClient.getGardenPlants).toHaveBeenCalledWith(1));
    await selectGarden(result, 2);
    await act(async () => oldPlants.reject(new Error('Old plants failure')));

    expect(result.current.isLoadingSelectedGardenPlants).toBe(true);
    expect(result.current.selectedGarden.hasLoadedPlants).toBe(false);
    expect(result.current.feedback).toBeNull();
    await act(async () => activePlants.resolve(plantsFor(2)));
    expect(result.current.isLoadingSelectedGardenPlants).toBe(false);
  });

  it('loads normally under Strict Mode', async () => {
    const { result } = renderHook(useTracker, {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>
    });
    await waitFor(() => expect(result.current.todayTasks).toHaveLength(1));
    expect(result.current.selectedGarden.id).toBe(1);
    expect(result.current.calendarData[today][0].garden_id).toBe(1);
    expect(result.current.isLoadingGardens).toBe(false);
    expect(result.current.isLoadingSelectedGardenPlants).toBe(false);
    expect(result.current.feedback).toBeNull();
  });

  it('ignores a late garden summary failure after a newer load succeeds', async () => {
    const oldSummary = deferred();
    apiClient.getGardenSummaries.mockReturnValueOnce(oldSummary.promise);
    const { result } = renderHook(useTracker);
    await act(async () => result.current.loadGardens());
    await waitFor(() => expect(result.current.todayTasks).toHaveLength(1));
    await selectGarden(result, 2);
    await act(async () => oldSummary.reject(new Error('Old summaries failure')));
    expect(result.current.selectedGarden.id).toBe(2);
    expect(result.current.gardens).toHaveLength(2);
    expect(result.current.gardenLoadError).toBe('');
    expect(result.current.isLoadingGardens).toBe(false);
  });

  it('does not append a late Quick Log result to a different garden calendar', async () => {
    const pendingActivity = deferred();
    apiClient.addActivity.mockReturnValueOnce(pendingActivity.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(result.current.calendarData[today]).toHaveLength(1));
    let saving;
    act(() => { saving = result.current.addQuickActivity({ activity: 'watered', plant: 'Plant 1' }, today); });
    await selectGarden(result, 2);
    await act(async () => { pendingActivity.resolve({ id: 99 }); await saving; });
    expect(result.current.calendarData[today].map(activity => activity.garden_id)).toEqual([2]);
    expect(result.current.feedback).toBeNull();
  });

  it('does not reselect a task target garden after the user switches during save', async () => {
    const pendingTask = deferred();
    apiClient.createTask.mockReturnValueOnce(pendingTask.promise);
    const { result } = renderHook(useTracker);
    await waitFor(() => expect(result.current.todayTasks).toHaveLength(1));
    let saving;
    act(() => { saving = result.current.saveTask({ title: 'Water', garden_id: 2, due_date: today }); });
    await selectGarden(result, 2);
    await selectGarden(result, 1);
    await act(async () => { pendingTask.resolve({ id: 99 }); await saving; });
    expect(result.current.selectedGarden.id).toBe(1);
    expect(result.current.todayTasks.map(task => task.garden_id)).toEqual([1]);
    expect(result.current.feedback).toBeNull();
  });
});
