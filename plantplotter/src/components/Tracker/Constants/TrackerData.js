// Main tracker data file - imports from separated data files

import { generateCalendarData, addActivity, getActivitiesByGarden } from './CalendarData';
import { activityTypes, plantsList, getPlantsForGarden } from './ActivitiesData';

// Gardens data
export const gardens = [
  { id: 1, name: 'Herb Garden', icon: '🌿' },
  { id: 2, name: 'Fruit Garden', icon: '🍎' },
  { id: 3, name: 'Vegetable Garden', icon: '🥕' }
];

// Weather data
export const weatherData = {
  current: {
    temp: 24,
    condition: 'Sunny',
    humidity: 65,
    description: 'Light breeze'
  }
};

// Re-export calendar and activity functions
export { 
  generateCalendarData, 
  addActivity, 
  getActivitiesByGarden,
  activityTypes,
  plantsList,
  getPlantsForGarden
};