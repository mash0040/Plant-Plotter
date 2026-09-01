'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sprout } from 'lucide-react';
import GardenSelector from '@/components/Tracker/GardenSelector';
import QuickActions from '@/components/Tracker/QuickActions';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import DetailedWeatherModal from '@/components/Tracker/DetailedWeatherModal';
import TasksList from '@/components/Tracker/TasksList';
import ActivityModal from '@/components/Tracker/ActivityModal';
import TaskEditModal from '@/components/Tracker/TaskEditModal';
import ActivityEditModal from '@/components/Tracker/ActivityEditModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequestErrorNotice from '@/components/RequestErrorNotice';
import { useWeather } from '@/hooks/useWeather'; 
import useBodyScrollLock from '@/hooks/useBodyScrollLock';
import apiClient from '@/lib/api';
import { getUserFacingErrorMessage, isAuthenticationError, shouldUseLocalReadFallback } from '@/lib/apiErrors';

function TrackingPageContent() {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [isLoadingGardens, setIsLoadingGardens] = useState(true);
  const [isLoadingSelectedGardenPlants, setIsLoadingSelectedGardenPlants] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity: '',
    plant: '',
    notes: '',
    gardenId: null
  });
  
  // Task state
  const [todayTasks, setTodayTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [calendarTasks, setCalendarTasks] = useState({});
  const [taskError, setTaskError] = useState('');
  const [taskSuccess, setTaskSuccess] = useState('');
  const [activityError, setActivityError] = useState('');
  const [activitySuccess, setActivitySuccess] = useState('');
  const [gardenLoadError, setGardenLoadError] = useState('');
  const [taskPlantLibrary, setTaskPlantLibrary] = useState([]);
  const [isTaskPlantLibraryLoading, setIsTaskPlantLibraryLoading] = useState(false);
  const trackerMessageRef = useRef(null);
  
  // Edit modal states
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showActivityEditModal, setShowActivityEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  
  // Weather modal state
  const [showDetailedWeather, setShowDetailedWeather] = useState(false);
  
  // Share one weather request between the card and detailed modal.
  const weatherState = useWeather();
  const { weatherData } = weatherState;
  useBodyScrollLock(Boolean(activityToDelete));

  useEffect(() => {
    if (!taskSuccess) return undefined;

    const timeoutId = setTimeout(() => setTaskSuccess(''), 4000);
    return () => clearTimeout(timeoutId);
  }, [taskSuccess]);

  useEffect(() => {
    if (!activitySuccess) return undefined;

    const timeoutId = setTimeout(() => setActivitySuccess(''), 4000);
    return () => clearTimeout(timeoutId);
  }, [activitySuccess]);

  useEffect(() => {
    if (!taskError && !taskSuccess && !activityError && !activitySuccess) return;

    trackerMessageRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }, [taskError, taskSuccess, activityError, activitySuccess]);

  // Load gardens from the API
  useEffect(() => {
    loadGardens();
  }, []);

  // Load tasks and activities when garden changes
  useEffect(() => {
    if (selectedGarden?.hasLoadedPlants) {
      loadTasks();
      loadActivities();
    } else if (selectedGarden) {
      loadSelectedGardenPlants();
    }
  }, [selectedGarden]);

  // Also load activities on initial page load
  useEffect(() => {
    if (selectedGarden) {
      loadActivities();
    }
  }, []);

  const loadGardens = async () => {
    try {
      setIsLoadingGardens(true);
      setGardenLoadError('');
      // Try to load from API first
      const gardens = await apiClient.getGardenSummaries();
      
      // Transform gardens for tracker format
      const trackerGardens = gardens.map(garden => {
        const plantCount = garden.plantCount || garden.plant_count || 0;
        return {
          id: garden.id,
          name: garden.name,
          icon: getGardenIcon(garden),
          plantCount,
          status: garden.status || 'Active',
          location: garden.location || 'Unknown',
          plantedItems: [],
          hasLoadedPlants: plantCount === 0
        };
      });
      
      setGardens(trackerGardens);
      if (trackerGardens.length > 0 && !selectedGarden) {
        setSelectedGarden(trackerGardens[0]);
      }
      setGardenLoadError('');
      setActivityError('');
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      if (isAuthenticationError(error)) {
        setGardens([]);
        setGardenLoadError('');
        return;
      }

      const errorMessage = getUserFacingErrorMessage(error, 'Could not load your gardens. Please try again.');

      if (shouldUseLocalReadFallback(error)) {
        try {
          const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');

          const trackerGardens = localGardens.map(garden => ({
            id: garden.id,
            name: garden.name,
            icon: getGardenIcon(garden),
            plantCount: garden.plantCount || garden.plantedItems?.length || 0,
            status: garden.status || 'Active',
            location: garden.location || 'Unknown',
            plantedItems: garden.plantedItems || [],
            hasLoadedPlants: true
          }));

          setGardens(trackerGardens);
          if (trackerGardens.length > 0 && !selectedGarden) {
            setSelectedGarden(trackerGardens[0]);
          }
          if (trackerGardens.length > 0) {
            setGardenLoadError('');
            setActivityError(`Showing local garden data. ${errorMessage}`);
          } else {
            setGardenLoadError(errorMessage);
            setActivityError('');
          }
        } catch (localError) {
          console.error('Failed to load from localStorage:', localError);
          setGardens([]);
          setGardenLoadError(errorMessage);
          setActivityError('');
        }
      } else {
        setGardens([]);
        setGardenLoadError(errorMessage);
        setActivityError('');
      }
    } finally {
      setIsLoadingGardens(false);
    }
  };

  const loadSelectedGardenPlants = async () => {
    if (!selectedGarden || selectedGarden.hasLoadedPlants) return;

    try {
      setIsLoadingSelectedGardenPlants(true);
      const plantedItems = await apiClient.getGardenPlants(selectedGarden.id);
      const gardenWithPlants = {
        ...selectedGarden,
        plantCount: plantedItems.length,
        plantedItems,
        hasLoadedPlants: true
      };

      setSelectedGarden(gardenWithPlants);
      setGardens(prevGardens => prevGardens.map(garden => (
        garden.id === gardenWithPlants.id ? gardenWithPlants : garden
      )));
    } catch (error) {
      console.error('Failed to load selected garden plants:', error);
      setActivityError(getUserFacingErrorMessage(error, 'Could not load plants for this garden. Please try again.'));
      setSelectedGarden(prevGarden => prevGarden
        ? { ...prevGarden, hasLoadedPlants: true }
        : prevGarden
      );
    } finally {
      setIsLoadingSelectedGardenPlants(false);
    }
  };

  // Load activities from API
  const loadActivities = async () => {
    if (!selectedGarden) return;
    
    try {
      const activities = await apiClient.getActivities(selectedGarden.id);
      
      // Transform activities to calendar format
      const calendarActivities = {};
      const currentPlantNames = new Set((selectedGarden.plantedItems || []).map(plant => (
        plant?.name || plant?.plant_name || plant?.plantName || ''
      )).filter(Boolean));
      activities.forEach(activity => {
        const dateKey = getDateKey(activity.activity_date || activity.created_at);
        const plantName = activity.plant_name || 'Unknown Plant';
        
        if (!calendarActivities[dateKey]) {
          calendarActivities[dateKey] = [];
        }
        
        // Create time string from activity_time or created_at
        let timeString;
        if (activity.activity_time) {
          // If activity_time is in HH:MM:SS format, convert to display format
          timeString = activity.activity_time.substring(0, 5); // Get HH:MM
        } else {
          // Fallback to created_at time
          timeString = new Date(activity.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        calendarActivities[dateKey].push({
          id: activity.id,
          activity: activity.activity_type,
          plant: plantName,
          notes: activity.notes || '',
          time: timeString,
          activity_date: dateKey,
          activity_type: activity.activity_type,
          plant_name: plantName,
          garden_id: activity.garden_id,
          plant_no_longer_planted: plantName !== 'Unknown Plant' && !currentPlantNames.has(plantName)
        });
      });
      
      setCalendarData(calendarActivities);
      
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivityError(getUserFacingErrorMessage(error, 'Failed to load activities. Please try again.'));
      // Keep existing calendar data or use empty
      setCalendarData({});
    }
  };

  // Helper function to get garden icon based on garden data
  const getGardenIcon = (garden) => {
    if (garden.plantedItems && garden.plantedItems.length > 0) {
      // Get the most common plant category
      const categories = garden.plantedItems.reduce((acc, plant) => {
        const category = plant.category || plant.plantCategory || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      const mostCommon = Object.keys(categories).reduce((a, b) => 
        categories[a] > categories[b] ? a : b
      );
      
      // Return icon based on most common category
      switch (mostCommon) {
        case 'vegetables': return 'Veg';
        case 'fruits': return 'Fruit';
        case 'herbs': return 'Herb';
        case 'flowers': return 'Flower';
        default: return 'Garden';
      }
    }
    
    // Default icon based on garden name or location
    const name = garden.name?.toLowerCase() || '';
    const location = garden.location?.toLowerCase() || '';
    
    if (name.includes('herb') || location.includes('herb')) return 'Herb';
    if (name.includes('vegetable') || location.includes('vegetable')) return 'Veg';
    if (name.includes('fruit') || location.includes('fruit')) return 'Fruit';
    if (name.includes('flower') || location.includes('flower')) return 'Flower';
    
    return 'Garden';
  };

  const getDateKey = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    return new Date(value).toISOString().split('T')[0];
  };

  const getTodayDateKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  };

  const isFutureDateKey = (dateKey) => dateKey > getTodayDateKey();
  const getPlantedItemName = (plant) => plant?.name || plant?.plant_name || plant?.plantName || '';
  const selectedGardenPlants = selectedGarden?.plantedItems || [];
  const hasSelectedGardenPlants = selectedGardenPlants.some(plant => getPlantedItemName(plant));
  const isSelectedGardenReady = Boolean(selectedGarden?.hasLoadedPlants) && !isLoadingSelectedGardenPlants;
  const isQuickLogDisabled = isFutureDateKey(selectedDate) || !hasSelectedGardenPlants;
  const quickLogHelperText = isFutureDateKey(selectedDate)
    ? 'Quick Log is for completed care. Select today or a past date, or create a task for future work.'
    : 'Add plants to this garden before logging care activity.';
  const taskHelperText = 'Add plants to this garden before creating care tasks.';

  const normalizeTask = (task) => {
    const dueDate = getDateKey(task.due_date || task.dueDate);
    const isRecurring = Boolean(task.is_recurring ?? task.isRecurring);
    const recurringPattern = task.recurring_pattern || task.recurringPattern || 'none';
    // 'overdue' is a derived state from due_date < today, not a stored status we expose.
    // Treat any 'overdue' or 'in_progress' rows as pending so list filtering stays date-driven.
    const rawStatus = task.status;
    const backendSafeStatus = (rawStatus === 'in_progress' || rawStatus === 'overdue') ? 'pending' : rawStatus;

    return {
      ...task,
      garden_id: task.garden_id ?? task.gardenId,
      gardenId: task.gardenId ?? task.garden_id,
      due_date: dueDate,
      dueDate,
      plant_name: task.plant_name || task.plant || '',
      plant: task.plant || task.plant_name || '',
      task_type: task.task_type || task.taskType || 'maintenance',
      taskType: task.taskType || task.task_type || 'maintenance',
      estimated_duration: task.estimated_duration ?? task.estimatedDuration ?? '',
      estimatedDuration: task.estimatedDuration ?? task.estimated_duration,
      is_recurring: isRecurring,
      isRecurring,
      recurring_pattern: recurringPattern,
      recurringPattern,
      priority: task.priority || 'medium',
      status: backendSafeStatus || 'pending'
    };
  };

  const isPendingTask = (task) => task.status === 'pending';
  const sortTasksByDueDate = (tasks) => {
    return [...tasks].sort((a, b) => {
      const aDue = `${a.dueDate || ''} ${a.due_time || a.dueTime || ''}`;
      const bDue = `${b.dueDate || ''} ${b.due_time || b.dueTime || ''}`;
      return aDue.localeCompare(bDue) || Number(a.id || 0) - Number(b.id || 0);
    });
  };

  const loadTasks = async () => {
    if (!selectedGarden) return;

    try {
      setTaskError('');
      const backendTasks = await apiClient.getTasks(selectedGarden.id);
      const normalizedTasks = Array.isArray(backendTasks)
        ? backendTasks.map(normalizeTask)
        : [];

      const today = getTodayDateKey();
      const calendarTaskData = normalizedTasks
        .filter(task => task.dueDate && isPendingTask(task))
        .reduce((groupedTasks, task) => {
          if (!groupedTasks[task.dueDate]) groupedTasks[task.dueDate] = [];
          groupedTasks[task.dueDate].push(task);
          return groupedTasks;
        }, {});
      Object.keys(calendarTaskData).forEach(dateKey => {
        calendarTaskData[dateKey] = sortTasksByDueDate(calendarTaskData[dateKey]);
      });

      const todayTasks = sortTasksByDueDate(normalizedTasks.filter(task => task.dueDate === today && isPendingTask(task)));
      const upcomingTasks = sortTasksByDueDate(normalizedTasks.filter(task => (
        task.dueDate && isPendingTask(task) && task.dueDate > today
      )));
      const overdueTasks = sortTasksByDueDate(normalizedTasks.filter(task => (
        task.dueDate && isPendingTask(task) && task.dueDate < today
      )));

      setTodayTasks(todayTasks);
      setUpcomingTasks(upcomingTasks);
      setOverdueTasks(overdueTasks);
      setCalendarTasks(calendarTaskData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      if (isAuthenticationError(error)) {
        setTodayTasks([]);
        setUpcomingTasks([]);
        setOverdueTasks([]);
        setCalendarTasks({});
        return;
      }

      setTaskError(getUserFacingErrorMessage(error, 'Failed to load tasks. Please try again.'));
      setTodayTasks([]);
      setUpcomingTasks([]);
      setOverdueTasks([]);
      setCalendarTasks({});
    }
  };

  const getTaskUpdatePayload = (task, updates = {}) => {
    const normalizedTask = normalizeTask({ ...task, ...updates });

    return {
      title: normalizedTask.title,
      description: normalizedTask.description || '',
      due_date: normalizedTask.dueDate || null,
      priority: normalizedTask.priority || 'medium',
      status: normalizedTask.status || 'pending',
      plant_name: normalizedTask.plant_name || null,
      task_type: normalizedTask.task_type || 'maintenance',
      estimated_duration: normalizedTask.estimated_duration || null,
      is_recurring: normalizedTask.is_recurring,
      recurring_pattern: normalizedTask.recurring_pattern === 'none' ? null : normalizedTask.recurring_pattern,
      notes: normalizedTask.notes || ''
    };
  };

  const getTaskCreatePayload = (taskData) => {
    const recurringPattern = taskData.recurring_pattern || 'none';

    return {
      title: taskData.title,
      description: taskData.description || '',
      garden_id: taskData.garden_id,
      due_date: taskData.due_date,
      priority: taskData.priority || 'medium',
      status: 'pending',
      plant_name: taskData.plant_name || null,
      task_type: taskData.task_type || 'maintenance',
      estimated_duration: taskData.estimated_duration || null,
      is_recurring: recurringPattern !== 'none',
      recurring_pattern: recurringPattern === 'none' ? null : recurringPattern,
      notes: taskData.notes || ''
    };
  };

  const handleTaskComplete = async (taskId) => {
    const taskToComplete = [...todayTasks, ...upcomingTasks, ...overdueTasks].find(task => task.id === taskId);
    if (!taskToComplete) return;

    try {
      await apiClient.updateTask(taskId, getTaskUpdatePayload(taskToComplete, { status: 'completed' }));
      await loadTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      setTaskError(getUserFacingErrorMessage(error, 'Failed to complete task. Please try again.'));
    }
  };

  const handleQuickAction = (action) => {
    if (!selectedGarden) return;
    if (isQuickLogDisabled) return;
    setActivityError('');
    setActivitySuccess('');
    
    setFormData({ 
      activity: action, 
      plant: '', 
      notes: '',
      gardenId: selectedGarden.id 
    });
    setShowForm(true);
  };

  const handleSubmitActivity = async (activityData) => {
    if (!selectedGarden) return;
    
    try {
      setActivityError('');
      setActivitySuccess('');
      // Try to add activity via API
      const newActivityData = {
        ...activityData,
        gardenId: selectedGarden.id,
        date: selectedDate
      };
      
      const savedActivity = await apiClient.addActivity(newActivityData);
      
      // Add to local calendar data for immediate UI update
      const activityForCalendar = {
        id: savedActivity.id,
        activity: activityData.activity,
        plant: activityData.plant,
        notes: activityData.notes,
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        activity_date: selectedDate,
        activity_type: activityData.activity,
        plant_name: activityData.plant,
        garden_id: selectedGarden.id
      };
      
      const updatedCalendarData = { ...calendarData };
      if (!updatedCalendarData[selectedDate]) {
        updatedCalendarData[selectedDate] = [];
      }
      updatedCalendarData[selectedDate].push(activityForCalendar);
      setCalendarData(updatedCalendarData);
      setActivitySuccess('Activity logged.');
      
    } catch (error) {
      console.error('Failed to add activity via API:', error);
      setActivityError(getUserFacingErrorMessage(error, 'Failed to log activity. Please try again.'));
    }
    
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '', gardenId: null });
  };

  // Activity management functions
  const handleActivityEdit = (activity) => {
    setActivityError('');
    setActivitySuccess('');
    setEditingActivity(activity);
    setShowActivityEditModal(true);
  };

  const handleActivityAdd = () => {
    setActivityError('');
    setActivitySuccess('');
    setEditingActivity(null);
    setShowActivityEditModal(true);
  };

  const handleActivitySave = async (activityData) => {
    try {
      setActivityError('');
      setActivitySuccess('');
      if (activityData.id) {
        // Update existing activity
        await apiClient.updateActivity(activityData.id, {
          activity_type: activityData.activity_type,
          plant_name: activityData.plant_name,
          notes: activityData.notes,
          activity_date: activityData.activity_date
        });
      } else {
        // Create new activity
        await apiClient.addActivity({
          gardenId: activityData.garden_id,
          activity: activityData.activity_type,
          plant: activityData.plant_name,
          notes: activityData.notes,
          date: activityData.activity_date
        });
      }
      
      // Reload activities to refresh calendar
      await loadActivities();
      setActivitySuccess(activityData.id ? 'Activity updated.' : 'Activity logged.');
      
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw error;
    }
  };

  const handleActivityDelete = async (activityOrId) => {
    const activityId = typeof activityOrId === 'object' ? activityOrId.id : activityOrId;

    try {
      await apiClient.deleteActivity(activityId);
      await loadActivities();
      setActivitySuccess('Activity deleted.');
      
    } catch (error) {
      console.error('Failed to delete activity:', error);
      throw error;
    }
  };

  const handleActivityDeleteRequest = (activity) => {
    setActivityToDelete(activity);
  };

  const loadTaskPlantLibrary = async () => {
    if (taskPlantLibrary.length > 0 || isTaskPlantLibraryLoading) return;

    try {
      setIsTaskPlantLibraryLoading(true);
      const plants = await apiClient.getPlantLibrary();
      setTaskPlantLibrary(Array.isArray(plants) ? plants : []);
    } catch (error) {
      console.error('Failed to load task plant library:', error);
      setTaskError(getUserFacingErrorMessage(error, 'Plant library could not be loaded for planting tasks.'));
    } finally {
      setIsTaskPlantLibraryLoading(false);
    }
  };

  const handleConfirmActivityDelete = async () => {
    if (!activityToDelete || isDeletingActivity) return;

    try {
      setIsDeletingActivity(true);
      setActivityError('');
      setActivitySuccess('');
      await handleActivityDelete(activityToDelete);
      setActivityToDelete(null);
    } catch (error) {
      setActivityError(getUserFacingErrorMessage(error, 'Failed to delete activity. Please try again.'));
    } finally {
      setIsDeletingActivity(false);
    }
  };

  // Task management functions
  const handleTaskEdit = (task) => {
    setTaskError('');
    setTaskSuccess('');
    setEditingTask(task);
    setShowTaskEditModal(true);
    loadTaskPlantLibrary();
  };

  const handleTaskAdd = () => {
    setTaskError('');
    setTaskSuccess('');
    setEditingTask(null);
    setShowTaskEditModal(true);
    loadTaskPlantLibrary();
  };

  const handleTaskSave = async (taskData) => {
    try {
      setTaskError('');
      setTaskSuccess('');
      if (taskData.id) {
        // Update existing task
        await apiClient.updateTask(taskData.id, getTaskUpdatePayload(taskData));
        setTaskSuccess('Task updated.');
        await loadTasks();
      } else {
        // Create new task
        const createPayload = getTaskCreatePayload(taskData);
        await apiClient.createTask(createPayload);
        setTaskSuccess('Task created.');
        const targetGarden = gardens.find(garden => String(garden.id) === String(createPayload.garden_id));
        if (targetGarden && String(targetGarden.id) !== String(selectedGarden?.id)) {
          setSelectedGarden(targetGarden);
          return;
        }
        await loadTasks();
      }
      
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      setTaskError('');
      setTaskSuccess('');
      await apiClient.deleteTask(taskId);
      
      // Reload tasks
      await loadTasks();
      setTaskSuccess('Task deleted.');
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  // Filter calendar data by selected garden
  const filteredCalendarData = selectedGarden ? calendarData : {};

  if (isLoadingGardens || isLoadingSelectedGardenPlants) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracker data...</p>
        </div>
      </div>
    );
  }

  if (gardenLoadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
          <RequestErrorNotice
            title="Could not load tracker"
            message={gardenLoadError}
            onRetry={loadGardens}
          />
          <Link
            href="/gardens"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            Go to My Gardens
          </Link>
        </div>
      </div>
    );
  }

  // Show empty state if no gardens
  if (gardens.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No gardens found</h3>
          <p className="text-gray-600 mb-6">
            You need to create at least one garden before you can start tracking activities.
          </p>
          <Link
            href="/gardens"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <Sprout className="w-5 h-5" />
            Create Your First Garden
          </Link>
        </div>
      </div>
    );
  }

  // Show loading state if gardens are loaded but no garden is selected
  if (!selectedGarden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900">
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        {(taskError || taskSuccess || activityError || activitySuccess) && (
          <div
            ref={trackerMessageRef}
            className="mb-4 grid gap-2"
            aria-live="polite"
            aria-atomic="true"
          >
            {taskError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 shadow-sm">
                {taskError}
              </div>
            )}

            {taskSuccess && (
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 shadow-sm">
                {taskSuccess}
              </div>
            )}

            {activityError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 shadow-sm">
                {activityError}
              </div>
            )}

            {activitySuccess && (
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700 shadow-sm">
                {activitySuccess}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 space-y-4 sm:space-y-6">
            <GardenSelector 
              gardens={gardens}
              selectedGarden={selectedGarden}
              onGardenSelect={setSelectedGarden}
            />
            <QuickActions 
              onQuickAction={handleQuickAction}
              selectedGarden={selectedGarden}
              disabled={isQuickLogDisabled}
              helperText={quickLogHelperText}
              managePlantsHref={!hasSelectedGardenPlants ? `/garden?id=${selectedGarden.id}` : ''}
            />
          </div>

          {/* Main Calendar */}
          <div className="w-full lg:flex-1 min-w-0">
            <TrackingCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              calendarData={filteredCalendarData}
              taskData={calendarTasks}
              onActivityEdit={handleActivityEdit}
              onActivityDelete={handleActivityDeleteRequest}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 space-y-4 sm:space-y-6">
            <WeatherWidget
              weatherState={weatherState}
              onViewDetails={weatherData ? () => setShowDetailedWeather(true) : undefined}
            />

            <div className="rounded-lg bg-white p-4 text-gray-900 shadow-lg">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold text-gray-900">Care Tasks</h3>
                <button
                  type="button"
                  onClick={handleTaskAdd}
                  disabled={!hasSelectedGardenPlants}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create Task
                </button>
              </div>
              {isSelectedGardenReady && !hasSelectedGardenPlants && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>{taskHelperText}</p>
                  <Link
                    href={`/garden?id=${selectedGarden.id}`}
                    className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800"
                  >
                    Manage Plants
                  </Link>
                </div>
              )}
            </div>
            <TasksList
              title="Today Tasks"
              tasks={todayTasks}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={hasSelectedGardenPlants ? handleTaskAdd : null}
              emptyMessage="No tasks for today"
            />
            <TasksList
              title="Overdue Tasks"
              tasks={overdueTasks}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={null}
              emptyMessage="No overdue tasks"
            />
            <TasksList
              title="Upcoming Tasks"
              tasks={upcomingTasks}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={hasSelectedGardenPlants ? handleTaskAdd : null}
              showCheckboxes={true}
              emptyMessage="No upcoming tasks"
            />
          </div>
        </div>
      </div>

      {/* Activity Form Modal */}
      {showForm && selectedGarden && (
        <ActivityModal
          isOpen={showForm}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmitActivity}
          onClose={() => setShowForm(false)}
          selectedGarden={selectedGarden}
        />
      )}

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={showTaskEditModal}
        onClose={() => {
          setShowTaskEditModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleTaskSave}
        onDelete={editingTask?.id ? handleTaskDelete : null}
        gardens={gardens}
        selectedGarden={selectedGarden}
        plantLibrary={taskPlantLibrary}
        isPlantLibraryLoading={isTaskPlantLibraryLoading}
      />

      {/* Activity Edit Modal */}
      <ActivityEditModal
        isOpen={showActivityEditModal}
        onClose={() => {
          setShowActivityEditModal(false);
          setEditingActivity(null);
        }}
        activity={editingActivity}
        onSave={handleActivitySave}
        onDelete={editingActivity?.id ? handleActivityDelete : null}
        gardens={gardens}
        selectedGarden={selectedGarden}
        selectedDate={selectedDate}
      />

      {activityToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete activity?</h2>
            <p className="text-sm text-gray-600 mb-6">
              This will remove the {activityToDelete.activity || activityToDelete.activity_type} log for {activityToDelete.plant || activityToDelete.plant_name || 'this plant'}. This cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                disabled={isDeletingActivity}
                className="min-h-11 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmActivityDelete}
                disabled={isDeletingActivity}
                className="min-h-11 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
              >
                {isDeletingActivity ? 'Deleting...' : 'Delete Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Weather Modal */}
      <DetailedWeatherModal
        isOpen={showDetailedWeather}
        onClose={() => setShowDetailedWeather(false)}
        weatherData={weatherData}
        weatherError={weatherState.error}
        isWeatherLoading={weatherState.loading}
        onRetry={weatherState.refreshWeather}
      />
    </div>
  );
}

export default function TrackingPage() {
  return (
    <ProtectedRoute>
      <TrackingPageContent />
    </ProtectedRoute>
  );
}
