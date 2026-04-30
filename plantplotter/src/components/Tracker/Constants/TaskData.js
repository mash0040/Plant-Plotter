// Task management data and functions

import { gardens } from './TrackerData';

// Task types
export const taskTypes = {
  WATER: 'water',
  FERTILIZE: 'fertilize',
  HARVEST: 'harvest',
  PLANT: 'plant',
  PRUNE: 'prune',
  WEED: 'weed',
  INSPECT: 'inspect',
  MAINTENANCE: 'maintenance'
};

// Task status
export const taskStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue'
};

// Helper function to get today's date string
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper function to get tomorrow's date string
const getTomorrowString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Generate initial task database - this function is called each time to ensure fresh dates
const generateTaskDatabase = () => {
  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString();

  return {
    1: {
      id: 1,
      title: 'Water tomato plants',
      description: 'Morning watering for tomato seedlings',
      plant: 'Tomatoes',
      gardenId: 3,
      taskType: taskTypes.WATER,
      status: taskStatus.PENDING,
      priority: 'high',
      dueDate: todayStr,
      createdAt: `${todayStr}T06:00:00Z`,
      estimatedDuration: 15, // minutes
      isRecurring: true,
      recurringPattern: 'daily'
    },
    2: {
      id: 2,
      title: 'Fertilize carrot bed',
      description: 'Apply organic fertilizer to carrot growing area',
      plant: 'Carrots',
      gardenId: 3,
      taskType: taskTypes.FERTILIZE,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: todayStr,
      createdAt: `${todayStr}T07:00:00Z`,
      estimatedDuration: 30,
      isRecurring: false
    },
    3: {
      id: 3,
      title: 'Check pest damage on lettuce',
      description: 'Inspect lettuce leaves for pest damage and treat if necessary',
      plant: 'Lettuce',
      gardenId: 3,
      taskType: taskTypes.INSPECT,
      status: taskStatus.PENDING,
      priority: 'high',
      dueDate: todayStr,
      createdAt: `${todayStr}T08:00:00Z`,
      estimatedDuration: 10,
      isRecurring: false
    },
    4: {
      id: 4,
      title: 'Harvest basil leaves',
      description: 'Pick fresh basil leaves for drying',
      plant: 'Basil',
      gardenId: 1,
      taskType: taskTypes.HARVEST,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: todayStr, // Changed this to today for testing
      createdAt: `${todayStr}T09:00:00Z`,
      estimatedDuration: 20,
      isRecurring: false
    },
    5: {
      id: 5,
      title: 'Plant new lettuce seeds',
      description: 'Start new batch of lettuce for continuous harvest',
      plant: 'Lettuce',
      gardenId: 3,
      taskType: taskTypes.PLANT,
      status: taskStatus.PENDING,
      priority: 'low',
      dueDate: '2025-06-30',
      createdAt: `${todayStr}T10:00:00Z`,
      estimatedDuration: 45,
      isRecurring: false
    },
    6: {
      id: 6,
      title: 'Water pepper plants',
      description: 'Deep watering for pepper plants',
      plant: 'Peppers',
      gardenId: 3,
      taskType: taskTypes.WATER,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: '2025-07-01',
      createdAt: `${todayStr}T11:00:00Z`,
      estimatedDuration: 15,
      isRecurring: true,
      recurringPattern: 'every-2-days'
    },
    7: {
      id: 7,
      title: 'Harvest tomatoes',
      description: 'Pick ripe tomatoes for kitchen use',
      plant: 'Tomatoes',
      gardenId: 3,
      taskType: taskTypes.HARVEST,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: '2025-07-05',
      createdAt: `${todayStr}T12:00:00Z`,
      estimatedDuration: 25,
      isRecurring: false
    },
    8: {
      id: 8,
      title: 'Prune herb garden',
      description: 'Trim overgrown herbs to encourage new growth',
      plant: 'Herbs',
      gardenId: 1,
      taskType: taskTypes.PRUNE,
      status: taskStatus.PENDING,
      priority: 'low',
      dueDate: '2025-07-08',
      createdAt: `${todayStr}T13:00:00Z`,
      estimatedDuration: 60,
      isRecurring: false
    },
    9: {
      id: 9,
      title: 'Weed vegetable beds',
      description: 'Remove weeds from main vegetable growing areas',
      plant: 'Various',
      gardenId: 3,
      taskType: taskTypes.WEED,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: '2025-07-10',
      createdAt: `${todayStr}T14:00:00Z`,
      estimatedDuration: 90,
      isRecurring: true,
      recurringPattern: 'weekly'
    },
    10: {
      id: 10,
      title: 'Water herb garden',
      description: 'Gentle watering for delicate herbs',
      plant: 'Herbs',
      gardenId: 1,
      taskType: taskTypes.WATER,
      status: taskStatus.PENDING,
      priority: 'medium',
      dueDate: tomorrowStr,
      createdAt: `${todayStr}T15:00:00Z`,
      estimatedDuration: 10,
      isRecurring: true,
      recurringPattern: 'daily'
    }
  };
};

// Initialize task database - regenerate each time to ensure current dates
let taskDatabase = generateTaskDatabase();

// Function to reset tasks (useful for testing or refreshing data)
export const resetTaskDatabase = () => {
  taskDatabase = generateTaskDatabase();
};

// Task database operations
export const getAllTasks = () => {
  return Object.values(taskDatabase);
};

export const getTaskById = (taskId) => {
  return taskDatabase[taskId] || null;
};

export const getTodayTasks = (gardenId = null) => {
  const today = getTodayString();
  const allTasks = getAllTasks();
  
  console.log('Getting today tasks for date:', today);
  console.log('Available tasks:', allTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, status: t.status })));
  
  const filteredTasks = allTasks.filter(task => {
    const isToday = task.dueDate === today;
    const isPending = task.status === taskStatus.PENDING;
    const matchesGarden = gardenId ? task.gardenId === gardenId : true;
    
    console.log(`Task ${task.id}: isToday=${isToday}, isPending=${isPending}, matchesGarden=${matchesGarden}`);
    
    return isToday && isPending && matchesGarden;
  });
  
  console.log('Filtered today tasks:', filteredTasks);
  return filteredTasks;
};

export const getUpcomingTasks = (gardenId = null, daysAhead = 7) => {
  const today = new Date();
  const allTasks = getAllTasks();
  
  return allTasks.filter(task => {
    const taskDate = new Date(task.dueDate);
    const daysDifference = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
    const isUpcoming = daysDifference > 0 && daysDifference <= daysAhead;
    const isPending = task.status === taskStatus.PENDING;
    const matchesGarden = gardenId ? task.gardenId === gardenId : true;
    
    return isUpcoming && isPending && matchesGarden;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
};

export const getOverdueTasks = (gardenId = null) => {
  const today = getTodayString();
  const allTasks = getAllTasks();
  
  return allTasks.filter(task => {
    const isOverdue = task.dueDate < today;
    const isPending = task.status === taskStatus.PENDING;
    const matchesGarden = gardenId ? task.gardenId === gardenId : true;
    
    return isOverdue && isPending && matchesGarden;
  });
};

// Function to convert task type to activity type
const getActivityTypeFromTask = (taskType) => {
  switch (taskType) {
    case taskTypes.WATER:
      return 'watered';
    case taskTypes.FERTILIZE:
      return 'fertilized';
    case taskTypes.HARVEST:
      return 'harvested';
    case taskTypes.PLANT:
      return 'planted';
    case taskTypes.PRUNE:
      return 'harvested'; // or could be a new activity type
    case taskTypes.WEED:
      return 'fertilized'; // or could be a new activity type
    case taskTypes.INSPECT:
      return 'watered'; // or could be a new activity type
    default:
      return 'watered';
  }
};

export const completeTask = (taskId, onActivityAdd = null) => {
  if (taskDatabase[taskId]) {
    const task = taskDatabase[taskId];
    
    // Mark task as completed
    taskDatabase[taskId] = {
      ...task,
      status: taskStatus.COMPLETED,
      completedAt: new Date().toISOString()
    };
    
    // Add activity to calendar if callback is provided
    if (onActivityAdd && typeof onActivityAdd === 'function') {
      const today = getTodayString();
      const activityData = {
        activity: getActivityTypeFromTask(task.taskType),
        plant: task.plant,
        notes: `Completed task: ${task.title}`,
        gardenId: task.gardenId
      };
      
      onActivityAdd(today, activityData);
    }
    
    // Handle recurring tasks
    if (task.isRecurring) {
      createRecurringTask(task);
    }
    
    console.log(`Task ${taskId} completed successfully`);
    return true;
  }
  return false;
};

export const cancelTask = (taskId) => {
  if (taskDatabase[taskId]) {
    taskDatabase[taskId] = {
      ...taskDatabase[taskId],
      status: taskStatus.CANCELLED,
      cancelledAt: new Date().toISOString()
    };
    return true;
  }
  return false;
};

export const createTask = (taskData) => {
  const newId = Math.max(...Object.keys(taskDatabase).map(Number)) + 1;
  const newTask = {
    id: newId,
    ...taskData,
    status: taskStatus.PENDING,
    createdAt: new Date().toISOString()
  };
  
  taskDatabase[newId] = newTask;
  return newTask;
};

export const updateTask = (taskId, updates) => {
  if (taskDatabase[taskId]) {
    taskDatabase[taskId] = {
      ...taskDatabase[taskId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return taskDatabase[taskId];
  }
  return null;
};

export const deleteTask = (taskId) => {
  if (taskDatabase[taskId]) {
    delete taskDatabase[taskId];
    return true;
  }
  return false;
};

// Helper function to create recurring tasks
const createRecurringTask = (completedTask) => {
  const today = new Date();
  let nextDueDate;
  
  switch (completedTask.recurringPattern) {
    case 'daily':
      nextDueDate = new Date(today);
      nextDueDate.setDate(today.getDate() + 1);
      break;
    case 'every-2-days':
      nextDueDate = new Date(today);
      nextDueDate.setDate(today.getDate() + 2);
      break;
    case 'weekly':
      nextDueDate = new Date(today);
      nextDueDate.setDate(today.getDate() + 7);
      break;
    default:
      return; // Don't create if pattern not recognized
  }
  
  const newTask = {
    ...completedTask,
    id: undefined, // Will be assigned by createTask
    status: taskStatus.PENDING,
    dueDate: nextDueDate.toISOString().split('T')[0],
    completedAt: undefined,
    createdAt: undefined // Will be set by createTask
  };
  
  delete newTask.id;
  delete newTask.completedAt;
  delete newTask.createdAt;
  
  createTask(newTask);
};

// Get garden name for task display
export const getGardenName = (gardenId) => {
  const garden = gardens.find(g => g.id === gardenId);
  return garden ? garden.name : 'Unknown Garden';
};

// Get task priority color
export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

// Format date for display
export const formatTaskDate = (dateString) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const dateStr = typeof dateString === 'string'
    ? dateString.split('T')[0]
    : `${dateString.getFullYear()}-${(dateString.getMonth() + 1).toString().padStart(2, '0')}-${dateString.getDate().toString().padStart(2, '0')}`;
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
  
  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  const [year, month, day] = dateStr.split('-').map(Number);
  
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};
