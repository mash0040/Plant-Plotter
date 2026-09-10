'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api';
import { isAuthenticationError } from '@/lib/apiErrors';
import {
  buildTaskCollections,
  getTaskCreatePayload,
  getTaskUpdatePayload
} from '@/lib/trackerData';
import { getTrackerFailureMessage } from './useTrackerFeedback';
import useTrackerRequestScope from './useTrackerRequestScope';

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
  const scope = useTrackerRequestScope(selectedGarden?.id);
  const [taskState, setTaskState] = useState(null);
  const completionRequests = useRef(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState(new Set());
  const taskCollections = taskState?.scope === scope ? taskState.collections : EMPTY_TASK_COLLECTIONS;
  const [taskPlantLibrary, setTaskPlantLibrary] = useState([]);
  const [isTaskPlantLibraryLoading, setIsTaskPlantLibraryLoading] = useState(false);
  const [taskPlantLibraryError, setTaskPlantLibraryError] = useState('');

  const clearTaskCollections = useCallback(() => {
    setTaskState(null);
  }, []);

  useEffect(() => {
    clearFeedback('tasks-load');
  }, [clearFeedback, scope]);

  const loadTasks = useCallback(async ({ preserveOnError = false } = {}) => {
    if (!selectedGarden || !scope.isActive()) return;
    const isCurrentRequest = scope.startRequest();

    try {
      const backendTasks = await apiClient.getTasks(selectedGarden.id);
      if (!isCurrentRequest()) return;
      setTaskState({ scope, collections: buildTaskCollections(backendTasks) });
      clearFeedback('tasks-load');
    } catch (error) {
      if (!isCurrentRequest()) return;
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
      if (!preserveOnError) clearTaskCollections();
    }
  }, [clearFeedback, clearTaskCollections, scope, selectedGarden, showError]);

  const completeTask = useCallback(async (taskId) => {
    if (!scope.isActive() || completionRequests.current.has(taskId)) return;
    const allTasks = [
      ...taskCollections.todayTasks,
      ...taskCollections.upcomingTasks,
      ...taskCollections.overdueTasks
    ];
    const taskToComplete = allTasks.find(task => task.id === taskId);
    if (!taskToComplete) return;

    completionRequests.current.add(taskId);
    setPendingTaskIds(new Set(completionRequests.current));
    clearFeedback(`task-complete-${taskId}`);
    try {
      await apiClient.updateTaskStatus(taskId, 'completed');
      if (!scope.isActive()) return;
      // Apply the confirmed completion even if the subsequent queue refresh fails.
      setTaskState(current => {
        if (current?.scope !== scope) return current;
        const remainingTasks = [
          ...current.collections.todayTasks,
          ...current.collections.upcomingTasks,
          ...current.collections.overdueTasks
        ].filter(task => task.id !== taskId);
        return { scope, collections: buildTaskCollections(remainingTasks) };
      });
      await loadTasks({ preserveOnError: true });
      if (!scope.isActive()) return;
      showSuccess(`task-complete-${taskId}`, 'Task completed.');
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to complete task:', error);
      showError(
        `task-complete-${taskId}`,
        getTrackerFailureMessage(error, 'The task could not be completed and remains in your care queue. Try completing it again.')
      );
    } finally {
      completionRequests.current.delete(taskId);
      setPendingTaskIds(new Set(completionRequests.current));
    }
  }, [clearFeedback, loadTasks, scope, showError, showSuccess, taskCollections]);

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
        if (!scope.isActive()) return;
        await loadTasks();
        if (!scope.isActive()) return;
        showSuccess('task-update', 'Task updated.');
        return;
      }

      const createPayload = getTaskCreatePayload(taskData);
      await apiClient.createTask(createPayload);
      if (!scope.isActive()) return;
      showSuccess('task-create', 'Task created.');
      const targetGarden = gardens.find(garden => String(garden.id) === String(createPayload.garden_id));
      if (targetGarden && String(targetGarden.id) !== String(selectedGarden?.id)) {
        setSelectedGarden(targetGarden);
        return;
      }
      await loadTasks();
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to save task:', error);
      throw error;
    }
  }, [gardens, loadTasks, scope, selectedGarden, setSelectedGarden, showSuccess]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await apiClient.deleteTask(taskId);
      if (!scope.isActive()) return;
      await loadTasks();
      if (!scope.isActive()) return;
      showSuccess('task-delete', 'Task deleted.');
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, [loadTasks, scope, showSuccess]);

  return {
    ...taskCollections,
    pendingTaskIds,
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
