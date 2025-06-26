// Calendar-specific data and functions

import { activityTypes, plantsList, predefinedActivities, generateRandomNote } from './ActivitiesData';
import { gardens } from './TrackerData';

// Generate random activities for calendar
export const generateRandomActivities = () => {
  const activities = {};
  let activityId = 100; // Start from 100 to avoid conflicts with predefined activities
  
  // Generate data for multiple months (from Jan 2024 to Dec 2025)
  const startYear = 2024;
  const endYear = 2025;
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Skip if we already have predefined activities for this date
        if (predefinedActivities[date]) continue;
        
        // 15% chance of having activities on any given day (reduced for better distribution)
        if (Math.random() > 0.85) {
          activities[date] = [];
          const numActivities = Math.floor(Math.random() * 2) + 1; // 1-2 activities
          
          for (let i = 0; i < numActivities; i++) {
            const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
            const plant = plantsList[Math.floor(Math.random() * plantsList.length)];
            const hour = Math.floor(Math.random() * 12) + 1;
            const minute = Math.floor(Math.random() * 60);
            const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
            const gardenId = Math.floor(Math.random() * gardens.length) + 1;
            
            activities[date].push({
              id: activityId++,
              activity: activityType.id,
              plant,
              time: `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`,
              notes: Math.random() > 0.6 ? generateRandomNote(activityType.id) : '',
              gardenId,
              createdAt: `${date}T${hour < 10 ? '0' : ''}${hour}:${minute < 10 ? '0' : ''}${minute}:00Z`
            });
          }
        }
      }
    }
  }
  
  return activities;
};

// Generate complete calendar data by combining predefined and random activities
export const generateCalendarData = () => {
  const randomActivities = generateRandomActivities();
  const calendarData = { ...randomActivities };
  
  // Add predefined activities (they will override any random activities for the same dates)
  Object.assign(calendarData, predefinedActivities);
  
  return calendarData;
};

// Calendar utility functions
export const getActivitiesForDate = (date, calendarData) => {
  return calendarData[date] || [];
};

export const getActivitiesByGarden = (calendarData, gardenId) => {
  const gardenActivities = {};
  
  Object.keys(calendarData).forEach(date => {
    const dayActivities = calendarData[date].filter(activity => activity.gardenId === gardenId);
    if (dayActivities.length > 0) {
      gardenActivities[date] = dayActivities;
    }
  });
  
  return gardenActivities;
};

export const getActivitiesByDateRange = (calendarData, startDate, endDate) => {
  const rangeActivities = {};
  
  Object.keys(calendarData).forEach(date => {
    if (date >= startDate && date <= endDate) {
      rangeActivities[date] = calendarData[date];
    }
  });
  
  return rangeActivities;
};

export const getActivitiesByPlant = (calendarData, plantName) => {
  const plantActivities = {};
  
  Object.keys(calendarData).forEach(date => {
    const dayActivities = calendarData[date].filter(activity => 
      activity.plant.toLowerCase().includes(plantName.toLowerCase())
    );
    if (dayActivities.length > 0) {
      plantActivities[date] = dayActivities;
    }
  });
  
  return plantActivities;
};

export const addActivity = (calendarData, date, activityData) => {
  const newActivity = {
    id: Date.now(), // Simple ID generation - in real app use UUID
    ...activityData,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString()
  };
  
  const newCalendarData = { ...calendarData };
  if (!newCalendarData[date]) {
    newCalendarData[date] = [];
  }
  
  newCalendarData[date].push(newActivity);
  return newCalendarData;
};

export const removeActivity = (calendarData, date, activityId) => {
  const newCalendarData = { ...calendarData };
  
  if (!newCalendarData[date]) return newCalendarData;
  
  const updatedActivities = newCalendarData[date].filter(activity => activity.id !== activityId);
  
  if (updatedActivities.length === 0) {
    delete newCalendarData[date];
  } else {
    newCalendarData[date] = updatedActivities;
  }
  
  return newCalendarData;
};

export const updateActivity = (calendarData, date, activityId, updatedData) => {
  const newCalendarData = { ...calendarData };
  
  if (!newCalendarData[date]) return newCalendarData;
  
  newCalendarData[date] = newCalendarData[date].map(activity => 
    activity.id === activityId 
      ? { ...activity, ...updatedData, updatedAt: new Date().toISOString() }
      : activity
  );
  
  return newCalendarData;
};

// Analytics functions
export const getActivityStats = (calendarData, gardenId = null) => {
  let totalActivities = 0;
  const activityCounts = {};
  const plantCounts = {};
  
  // Initialize activity counts
  activityTypes.forEach(type => {
    activityCounts[type.id] = 0;
  });
  
  Object.values(calendarData).forEach(dayActivities => {
    dayActivities.forEach(activity => {
      if (gardenId === null || activity.gardenId === gardenId) {
        totalActivities++;
        activityCounts[activity.activity]++;
        plantCounts[activity.plant] = (plantCounts[activity.plant] || 0) + 1;
      }
    });
  });
  
  return {
    totalActivities,
    activityCounts,
    plantCounts
  };
};

export const getUpcomingTasks = (calendarData, gardenId = null, daysAhead = 7) => {
  const today = new Date();
  const upcomingTasks = [];
  
  for (let i = 1; i <= daysAhead; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];
    
    const dayActivities = calendarData[dateStr] || [];
    dayActivities.forEach(activity => {
      if (gardenId === null || activity.gardenId === gardenId) {
        upcomingTasks.push({
          ...activity,
          date: dateStr,
          daysFromNow: i
        });
      }
    });
  }
  
  return upcomingTasks;
};