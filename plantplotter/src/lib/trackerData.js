export const getDateKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  return new Date(value).toISOString().split('T')[0];
};

export const getTodayDateKey = (today = new Date()) => (
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
);

export const isFutureDateKey = (dateKey, today = new Date()) => dateKey > getTodayDateKey(today);

export const getPlantedItemName = (plant) => (
  plant?.name || plant?.plant_name || plant?.plantName || ''
);

export const MISSING_PLANT_LABEL = 'Plant not recorded';

export const getGardenIcon = (garden) => {
  if (garden.plantedItems?.length > 0) {
    const categories = garden.plantedItems.reduce((counts, plant) => {
      const category = plant.category || plant.plantCategory || 'other';
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    const mostCommonCategory = Object.keys(categories).reduce((first, second) => (
      categories[first] > categories[second] ? first : second
    ));

    switch (mostCommonCategory) {
      case 'vegetables': return 'Veg';
      case 'fruits': return 'Fruit';
      case 'herbs': return 'Herb';
      case 'flowers': return 'Flower';
      default: return 'Garden';
    }
  }

  const name = garden.name?.toLowerCase() || '';
  const location = garden.location?.toLowerCase() || '';

  if (name.includes('herb') || location.includes('herb')) return 'Herb';
  if (name.includes('vegetable') || location.includes('vegetable')) return 'Veg';
  if (name.includes('fruit') || location.includes('fruit')) return 'Fruit';
  if (name.includes('flower') || location.includes('flower')) return 'Flower';

  return 'Garden';
};

export const normalizeTrackerGarden = (garden, { fromLocalStorage = false } = {}) => {
  const plantedItems = fromLocalStorage ? garden.plantedItems || [] : [];
  const plantCount = fromLocalStorage
    ? garden.plantCount || plantedItems.length || 0
    : garden.plantCount || garden.plant_count || 0;

  return {
    id: garden.id,
    name: garden.name,
    icon: getGardenIcon(fromLocalStorage ? { ...garden, plantedItems } : garden),
    plantCount,
    status: garden.status || 'Active',
    location: String(garden.location || '').trim() || 'No location set',
    plantedItems,
    hasLoadedPlants: fromLocalStorage || plantCount === 0
  };
};

export const normalizeTrackerGardens = (gardens, options) => (
  (Array.isArray(gardens) ? gardens : []).map(garden => normalizeTrackerGarden(garden, options))
);

export const hydrateTrackerGarden = (garden, plantedItems) => ({
  ...garden,
  plantCount: plantedItems.length,
  plantedItems,
  hasLoadedPlants: true
});

const formatActivityTime = (activity) => {
  if (activity.activity_time) return String(activity.activity_time).substring(0, 5);
  if (!activity.created_at) return '';

  const createdAt = new Date(activity.created_at);
  if (Number.isNaN(createdAt.getTime())) return '';

  return createdAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const buildActivityCalendar = (activities, plantedItems = []) => {
  const calendar = {};
  const currentPlantNames = new Set(plantedItems.map(getPlantedItemName).filter(Boolean));

  (Array.isArray(activities) ? activities : []).forEach(activity => {
    const dateKey = getDateKey(activity.activity_date || activity.created_at);
    const recordedPlantName = String(activity.plant_name || '').trim();
    const hasRecordedPlant = Boolean(recordedPlantName);
    const plantName = recordedPlantName || MISSING_PLANT_LABEL;

    if (!calendar[dateKey]) calendar[dateKey] = [];

    calendar[dateKey].push({
      id: activity.id,
      activity: activity.activity_type,
      plant: plantName,
      notes: activity.notes || '',
      time: formatActivityTime(activity),
      activity_date: dateKey,
      activity_type: activity.activity_type,
      plant_name: plantName,
      garden_id: activity.garden_id,
      plant_no_longer_planted: hasRecordedPlant && !currentPlantNames.has(recordedPlantName)
    });
  });

  return calendar;
};

export const createCalendarActivity = ({
  savedActivity,
  activityData,
  selectedDate,
  gardenId,
  now = new Date()
}) => ({
  id: savedActivity.id,
  activity: activityData.activity,
  plant: activityData.plant,
  notes: activityData.notes,
  time: now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }),
  activity_date: selectedDate,
  activity_type: activityData.activity,
  plant_name: activityData.plant,
  garden_id: gardenId
});

export const normalizeTask = (task) => {
  const dueDate = getDateKey(task.due_date || task.dueDate);
  const isRecurring = Boolean(task.is_recurring ?? task.isRecurring);
  const recurringPattern = task.recurring_pattern || task.recurringPattern || 'none';
  const backendSafeStatus = task.status === 'in_progress' || task.status === 'overdue'
    ? 'pending'
    : task.status;

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

export const sortTasksByDueDate = (tasks) => [...tasks].sort((firstTask, secondTask) => {
  const firstDue = `${firstTask.dueDate || ''} ${firstTask.due_time || firstTask.dueTime || ''}`;
  const secondDue = `${secondTask.dueDate || ''} ${secondTask.due_time || secondTask.dueTime || ''}`;
  return firstDue.localeCompare(secondDue) || Number(firstTask.id || 0) - Number(secondTask.id || 0);
});

export const buildTaskCollections = (tasks, today = new Date()) => {
  const normalizedTasks = (Array.isArray(tasks) ? tasks : []).map(normalizeTask);
  const todayDateKey = getTodayDateKey(today);
  const pendingTasks = normalizedTasks.filter(task => task.dueDate && task.status === 'pending');
  const calendarTasks = pendingTasks.reduce((groupedTasks, task) => {
    if (!groupedTasks[task.dueDate]) groupedTasks[task.dueDate] = [];
    groupedTasks[task.dueDate].push(task);
    return groupedTasks;
  }, {});

  Object.keys(calendarTasks).forEach(dateKey => {
    calendarTasks[dateKey] = sortTasksByDueDate(calendarTasks[dateKey]);
  });

  return {
    todayTasks: sortTasksByDueDate(pendingTasks.filter(task => task.dueDate === todayDateKey)),
    upcomingTasks: sortTasksByDueDate(pendingTasks.filter(task => task.dueDate > todayDateKey)),
    overdueTasks: sortTasksByDueDate(pendingTasks.filter(task => task.dueDate < todayDateKey)),
    calendarTasks
  };
};

export const getTaskUpdatePayload = (task, updates = {}) => {
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

export const getTaskCreatePayload = (taskData) => {
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
