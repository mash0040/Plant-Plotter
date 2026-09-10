'use client';
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import {
  buildActivityCalendar,
  createCalendarActivity
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';
import useTrackerRequestScope from './useTrackerRequestScope';

export default function useTrackerActivities({
  selectedGarden,
  showError,
  showSuccess,
  clearFeedback
}) {
  const scope = useTrackerRequestScope(selectedGarden?.id);
  const [calendarState, setCalendarState] = useState(null);
  const calendarData = calendarState?.scope === scope ? calendarState.calendarData : {};

  useEffect(() => {
    clearFeedback('activities-load');
  }, [clearFeedback, scope]);

  const loadActivities = useCallback(async () => {
    if (!selectedGarden || !scope.isActive()) return;
    const isCurrentRequest = scope.startRequest();

    try {
      const activities = await apiClient.getActivities(selectedGarden.id);
      if (!isCurrentRequest()) return;
      setCalendarState({ scope, calendarData: buildActivityCalendar(activities, selectedGarden.plantedItems) });
      clearFeedback('activities-load');
    } catch (error) {
      if (!isCurrentRequest()) return;
      console.error('Failed to load activities:', error);
      showError(
        'activities-load',
        getTrackerFailureMessage(error, 'Activities could not be loaded. The calendar may be out of date.')
      );
      setCalendarState(null);
    }
  }, [clearFeedback, scope, selectedGarden, showError]);

  const addQuickActivity = useCallback(async (activityData, selectedDate) => {
    if (!selectedGarden || !scope.isActive()) return;

    try {
      const savedActivity = await apiClient.addActivity({
        ...activityData,
        gardenId: selectedGarden.id,
        date: selectedDate
      });
      if (!scope.isActive()) return;
      const calendarActivity = createCalendarActivity({
        savedActivity,
        plantedItems: selectedGarden.plantedItems
      });
      const savedDate = calendarActivity.activity_date;
      // A read begun before this save must not overwrite its confirmed result.
      scope.startRequest();

      setCalendarState(currentState => {
        const currentCalendarData = currentState?.scope === scope ? currentState.calendarData : {};
        return {
          scope,
          calendarData: {
            ...currentCalendarData,
            [savedDate]: [
              ...(currentCalendarData[savedDate] || []).filter(activity => activity.id !== calendarActivity.id),
              calendarActivity
            ]
          }
        };
      });
      showSuccess('activity-create', 'Activity logged.');
      return savedActivity;
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to add activity via API:', error);
      // The open Quick Log dialog owns save errors and preserves the draft.
      throw error;
    }
  }, [scope, selectedGarden, showSuccess]);

  const saveActivity = useCallback(async (activityData) => {
    try {
      if (activityData.id) {
        await apiClient.updateActivity(activityData.id, {
          activity_type: activityData.activity_type,
          plant_name: activityData.plant_name,
          notes: activityData.notes,
          activity_date: activityData.activity_date
        });
      } else {
        await apiClient.addActivity({
          gardenId: activityData.garden_id,
          activity: activityData.activity_type,
          plant: activityData.plant_name,
          notes: activityData.notes,
          date: activityData.activity_date
        });
      }

      if (!scope.isActive()) return;
      await loadActivities();
      if (!scope.isActive()) return;
      showSuccess(
        activityData.id ? 'activity-update' : 'activity-create',
        activityData.id ? 'Activity updated.' : 'Activity logged.'
      );
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to save activity:', error);
      throw error;
    }
  }, [loadActivities, scope, showSuccess]);

  const deleteActivity = useCallback(async (activityOrId) => {
    const activityId = typeof activityOrId === 'object' ? activityOrId.id : activityOrId;

    try {
      await apiClient.deleteActivity(activityId);
      if (!scope.isActive()) return;
      await loadActivities();
      if (!scope.isActive()) return;
      showSuccess('activity-delete', 'Activity deleted.');
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to delete activity:', error);
      throw error;
    }
  }, [loadActivities, scope, showSuccess]);

  return {
    calendarData,
    loadActivities,
    addQuickActivity,
    saveActivity,
    deleteActivity
  };
}
