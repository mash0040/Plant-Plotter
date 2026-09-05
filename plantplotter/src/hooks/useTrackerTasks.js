'use client';
import { useCallback, useState } from 'react';
import apiClient from '@/lib/api';
import { isAuthenticationError } from '@/lib/apiErrors';
import {
  buildTaskCollections,
  getTaskCreatePayload,
  getTaskUpdatePayload
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';

const EMPTY_TASK_COLLECTIONS = {
  todayTasks: [],
  upcomingTasks: [],
  overdueTasks: [],
  calendarTasks: {}
};

export default function useTrackerTasks({
  gardens,
  selectedGarden,
  setSelectedGarden,
  showError,
  showSuccess,
  clearFeedback
}) {
  const [taskCollections, setTaskCollections] = useState(EMPTY_TASK_COLLECTIONS);
  const [taskPlantLibrary, setTaskPlantLibrary] = useState([]);
  const [isTaskPlantLibraryLoading, setIsTaskPlantLibraryLoading] = useState(false);
  const [taskPlantLibraryError, setTaskPlantLibraryError] = useState('');

  const clearTaskCollections = useCallback(() => {
    setTaskCollections(EMPTY_TASK_COLLECTIONS);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!selectedGarden) return;

    try {
      const backendTasks = await apiClient.getTasks(selectedGarden.id);
      setTaskCollections(buildTaskCollections(backendTasks));
      clearFeedback('tasks-load');
    } catch (error) {
      console.error('Failed to load tasks:', error);
      if (isAuthenticationError(error)) {
        clearTaskCollections();
        clearFeedback('tasks-load');
        return;
      }

      showError(
        'tasks-load',
        getTrackerFailureMessage(error, 'Tasks could not be loaded. The care queue may be out of date.')
      );
      clearTaskCollections();
    }
  }, [clearFeedback, clearTaskCollections, selectedGarden, showError]);

  const completeTask = useCallback(async (taskId) => {
    const allTasks = [
      ...taskCollections.todayTasks,
      ...taskCollections.upcomingTasks,
      ...taskCollections.overdueTasks
    ];
    const taskToComplete = allTasks.find(task => task.id === taskId);
    if (!taskToComplete) return;

    try {
      await apiClient.updateTask(
        taskId,
        getTaskUpdatePayload(taskToComplete, { status: 'completed' })
      );
      await loadTasks();
      showSuccess(`task-complete-${taskId}`, 'Task completed.');
    } catch (error) {
      console.error('Failed to complete task:', error);
      showError(
        `task-complete-${taskId}`,
        getTrackerFailureMessage(error, 'The task could not be completed and remains in your care queue.')
      );
    }
  }, [loadTasks, showError, showSuccess, taskCollections]);

  const loadTaskPlantLibrary = useCallback(async () => {
    if (taskPlantLibrary.length > 0 || isTaskPlantLibraryLoading) return;

    try {
      setIsTaskPlantLibraryLoading(true);
      setTaskPlantLibraryError('');
      const plants = await apiClient.getPlantLibrary();
      setTaskPlantLibrary(Array.isArray(plants) ? plants : []);
    } catch (error) {
      console.error('Failed to load task plant library:', error);
      setTaskPlantLibraryError(
        getTrackerFailureMessage(error, 'Plant options could not be loaded. Close and reopen the task editor to try again.')
      );
    } finally {
      setIsTaskPlantLibraryLoading(false);
    }
  }, [isTaskPlantLibraryLoading, taskPlantLibrary.length]);

  const clearTaskPlantLibraryError = useCallback(() => {
    setTaskPlantLibraryError('');
  }, []);

  const saveTask = useCallback(async (taskData) => {
    try {
      if (taskData.id) {
        await apiClient.updateTask(taskData.id, getTaskUpdatePayload(taskData));
        await loadTasks();
        showSuccess('task-update', 'Task updated.');
        return;
      }

      const createPayload = getTaskCreatePayload(taskData);
      await apiClient.createTask(createPayload);
      showSuccess('task-create', 'Task created.');
      const targetGarden = gardens.find(garden => String(garden.id) === String(createPayload.garden_id));
      if (targetGarden && String(targetGarden.id) !== String(selectedGarden?.id)) {
        setSelectedGarden(targetGarden);
        return;
      }
      await loadTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  }, [gardens, loadTasks, selectedGarden, setSelectedGarden, showSuccess]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await apiClient.deleteTask(taskId);
      await loadTasks();
      showSuccess('task-delete', 'Task deleted.');
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, [loadTasks, showSuccess]);

  return {
    ...taskCollections,
    taskPlantLibrary,
    isTaskPlantLibraryLoading,
    taskPlantLibraryError,
    clearTaskPlantLibraryError,
    loadTaskPlantLibrary,
    loadTasks,
    completeTask,
    saveTask,
    deleteTask
  };
}
