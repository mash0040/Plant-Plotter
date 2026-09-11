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
  calendarTasks: {},
  completedTasks: []
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
      const tasks = Array.isArray(backendTasks) ? backendTasks : [];
      setTaskState({ scope, tasks, collections: buildTaskCollections(tasks) });
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
        getTrackerFailureMessage(error, 'Tasks could not be loaded. The care queue and task history may be out of date.')
      );
      if (!preserveOnError) clearTaskCollections();
    }
  }, [clearFeedback, clearTaskCollections, scope, selectedGarden, showError]);

  const applyTaskChange = useCallback((taskId, changes) => {
    // An older read must not overwrite a confirmed completion, edit, or deletion.
    scope.startRequest();
    setTaskState(current => {
      if (current?.scope !== scope) return current;
      const previous = current.tasks.find(task => String(task.id) === String(taskId));
      const tasks = current.tasks.filter(task => String(task.id) !== String(taskId));
      if (changes) tasks.push({ ...previous, ...changes, id: taskId });
      return { scope, tasks, collections: buildTaskCollections(tasks) };
    });
  }, [scope]);

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
      const completedTask = await apiClient.updateTaskStatus(taskId, 'completed');
      if (!scope.isActive()) return;
      applyTaskChange(taskId, { ...completedTask, status: 'completed' });
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
  }, [applyTaskChange, clearFeedback, loadTasks, scope, showError, showSuccess, taskCollections]);

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
        const payload = getTaskUpdatePayload(taskData);
        const updatedTask = await apiClient.updateTask(taskData.id, payload);
        if (!scope.isActive()) return;
        applyTaskChange(taskData.id, { ...payload, ...updatedTask });
        await loadTasks({ preserveOnError: true });
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
  }, [applyTaskChange, gardens, loadTasks, scope, selectedGarden, setSelectedGarden, showSuccess]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await apiClient.deleteTask(taskId);
      if (!scope.isActive()) return;
      applyTaskChange(taskId, null);
      await loadTasks({ preserveOnError: true });
      if (!scope.isActive()) return;
      showSuccess('task-delete', 'Task deleted.');
    } catch (error) {
      if (!scope.isActive()) return;
      console.error('Failed to delete task:', error);
      throw error;
    }
  }, [applyTaskChange, loadTasks, scope, showSuccess]);

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
