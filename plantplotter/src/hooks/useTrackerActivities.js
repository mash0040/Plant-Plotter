'use client';
import { useCallback, useState } from 'react';
import apiClient from '@/lib/api';
import {
  buildActivityCalendar,
  createCalendarActivity
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';

export default function useTrackerActivities({
  selectedGarden,
  showError,
  showSuccess,
  clearFeedback
}) {
  const [calendarData, setCalendarData] = useState({});

  const loadActivities = useCallback(async () => {
    if (!selectedGarden) return;

    try {
      const activities = await apiClient.getActivities(selectedGarden.id);
      setCalendarData(buildActivityCalendar(activities, selectedGarden.plantedItems));
      clearFeedback('activities-load');
    } catch (error) {
      console.error('Failed to load activities:', error);
      showError(
        'activities-load',
        getTrackerFailureMessage(error, 'Activities could not be loaded. The calendar may be out of date.')
      );
      setCalendarData({});
    }
  }, [clearFeedback, selectedGarden, showError]);

  const addQuickActivity = useCallback(async (activityData, selectedDate) => {
    if (!selectedGarden) return;

    try {
      const savedActivity = await apiClient.addActivity({
        ...activityData,
        gardenId: selectedGarden.id,
        date: selectedDate
      });
      const calendarActivity = createCalendarActivity({
        savedActivity,
        activityData,
        selectedDate,
        gardenId: selectedGarden.id
      });

      setCalendarData(currentCalendarData => ({
        ...currentCalendarData,
        [selectedDate]: [
          ...(currentCalendarData[selectedDate] || []),
          calendarActivity
        ]
      }));
      showSuccess('activity-create', 'Activity logged.');
    } catch (error) {
      console.error('Failed to add activity via API:', error);
      showError(
        'activity-create',
        getTrackerFailureMessage(error, 'The activity could not be logged. No calendar entry was added.')
      );
    }
  }, [selectedGarden, showError, showSuccess]);

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

      await loadActivities();
      showSuccess(
        activityData.id ? 'activity-update' : 'activity-create',
        activityData.id ? 'Activity updated.' : 'Activity logged.'
      );
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw error;
    }
  }, [loadActivities, showSuccess]);

  const deleteActivity = useCallback(async (activityOrId) => {
    const activityId = typeof activityOrId === 'object' ? activityOrId.id : activityOrId;

    try {
      await apiClient.deleteActivity(activityId);
      await loadActivities();
      showSuccess('activity-delete', 'Activity deleted.');
    } catch (error) {
      console.error('Failed to delete activity:', error);
      throw error;
    }
  }, [loadActivities, showSuccess]);

  return {
    calendarData,
    loadActivities,
    addQuickActivity,
    saveActivity,
    deleteActivity
  };
}
