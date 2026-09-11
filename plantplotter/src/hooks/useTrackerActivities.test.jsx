import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import useTrackerActivities from './useTrackerActivities';

vi.mock('@/lib/api', () => ({
  default: {
    getActivities: vi.fn(),
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn()
  }
}));

const selectedGarden = {
  id: 7,
  plantedItems: [{ name: 'Tomato' }]
};

const createFeedback = () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  clearFeedback: vi.fn()
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTrackerActivities', () => {
  it('loads activities into calendar data for the selected garden', async () => {
    apiClient.getActivities.mockResolvedValue([
      {
        id: 2,
        garden_id: 7,
        activity_type: 'watered',
        plant_name: 'Tomato',
        activity_date: '2026-09-05',
        activity_time: '07:15:00'
      }
    ]);
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));

    await act(async () => result.current.loadActivities());

    expect(apiClient.getActivities).toHaveBeenCalledWith(7);
    expect(result.current.calendarData['2026-09-05'][0]).toMatchObject({
      id: 2,
      plant: 'Tomato',
      time: '07:15'
    });
    expect(feedback.clearFeedback).toHaveBeenCalledWith('activities-load');
  });

  it('adds a Quick Log result to the current calendar without a reload', async () => {
    apiClient.addActivity.mockResolvedValue({
      id: 15, garden_id: 7, activity_type: 'weeded', plant_name: 'Tomato',
      notes: 'Saved notes', activity_date: '2026-09-04', activity_time: '23:58:00'
    });
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));

    await act(async () => result.current.addQuickActivity({
      activity: 'weeded',
      plant: 'Tomato',
      notes: 'North side'
    }, '2026-09-05'));

    expect(apiClient.addActivity).toHaveBeenCalledWith({
      activity: 'weeded',
      plant: 'Tomato',
      notes: 'North side',
      gardenId: 7,
      date: '2026-09-05'
    });
    expect(result.current.calendarData['2026-09-05']).toBeUndefined();
    expect(result.current.calendarData['2026-09-04'][0]).toMatchObject({
      id: 15,
      activity: 'weeded',
      plant: 'Tomato',
      notes: 'Saved notes',
      time: '23:58',
      activity_date: '2026-09-04',
      garden_id: 7
    });
    expect(apiClient.getActivities).not.toHaveBeenCalled();
    expect(feedback.showSuccess).toHaveBeenCalledWith('activity-create', 'Activity logged.');
  });

  it('rejects a failed Quick Log save without adding an entry or showing a page error', async () => {
    const error = new Error('Offline');
    apiClient.addActivity.mockRejectedValueOnce(error);
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));
    await act(async () => {
      await expect(result.current.addQuickActivity({ activity: 'watered', plant: 'Tomato' }, '2026-09-05'))
        .rejects.toBe(error);
    });
    expect(result.current.calendarData).toEqual({});
    expect(feedback.showError).not.toHaveBeenCalled();
    expect(feedback.showSuccess).not.toHaveBeenCalled();
    expect(apiClient.addActivity).toHaveBeenCalledTimes(1);
  });

  it('keeps a confirmed save when an older calendar read finishes later', async () => {
    let finishRead;
    apiClient.getActivities.mockReturnValue(new Promise(resolve => { finishRead = resolve; }));
    apiClient.addActivity.mockResolvedValue({
      id: 15, garden_id: 7, activity_type: 'watered', plant_name: 'Tomato',
      activity_date: '2026-09-05', activity_time: '07:15:00'
    });
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));
    let loading;
    act(() => { loading = result.current.loadActivities(); });
    await act(async () => result.current.addQuickActivity({ activity: 'watered', plant: 'Tomato' }, '2026-09-05'));
    await act(async () => { finishRead([]); await loading; });
    expect(result.current.calendarData['2026-09-05'].map(activity => activity.id)).toEqual([15]);
  });

  it('does not duplicate an activity already present in a completed reload', async () => {
    const savedActivity = { id: 15, garden_id: 7, activity_type: 'watered', plant_name: 'Tomato',
      activity_date: '2026-09-05', activity_time: '07:15:00' };
    apiClient.getActivities.mockResolvedValue([savedActivity]);
    apiClient.addActivity.mockResolvedValue(savedActivity);
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));
    await act(async () => result.current.loadActivities());
    await act(async () => result.current.addQuickActivity({ activity: 'watered', plant: 'Tomato' }, '2026-09-05'));
    expect(result.current.calendarData['2026-09-05']).toHaveLength(1);
  });

  it('updates and deletes activities before refreshing calendar data', async () => {
    apiClient.updateActivity.mockResolvedValue({});
    apiClient.deleteActivity.mockResolvedValue({});
    apiClient.getActivities.mockResolvedValue([]);
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerActivities({ selectedGarden, ...feedback }));

    await act(async () => result.current.saveActivity({
      id: 12,
      activity_type: 'pruned',
      plant_name: 'Tomato',
      notes: 'Lower leaves',
      activity_date: '2026-09-05',
      activity_time: '09:15:32'
    }));
    await act(async () => result.current.deleteActivity(12));

    expect(apiClient.updateActivity).toHaveBeenCalledWith(12, {
      activity_type: 'pruned',
      plant_name: 'Tomato',
      notes: 'Lower leaves',
      activity_date: '2026-09-05',
      activity_time: '09:15:32'
    });
    expect(apiClient.deleteActivity).toHaveBeenCalledWith(12);
    expect(apiClient.getActivities).toHaveBeenCalledTimes(2);
    expect(feedback.showSuccess).toHaveBeenCalledWith('activity-update', 'Activity updated.');
    expect(feedback.showSuccess).toHaveBeenCalledWith('activity-delete', 'Activity deleted.');
  });
});
