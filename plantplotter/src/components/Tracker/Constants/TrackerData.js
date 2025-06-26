// Fake data for Garden Tracker

export const gardens = [
  { id: 1, name: 'Herb Garden', icon: '🌿' },
  { id: 2, name: 'Fruit Garden', icon: '🍎' },
  { id: 3, name: 'Vegetable Garden', icon: '🥕' }
];

export const weatherData = {
  current: {
    temp: 24,
    condition: 'Sunny',
    humidity: 65,
    description: 'Light breeze'
  }
};

// Generate fake calendar data for multiple months and years
export const generateCalendarData = () => {
  const data = {};
  const activities = ['planted', 'watered', 'fertilized', 'harvested'];
  const plants = ['Tomatoes', 'Carrots', 'Basil', 'Lettuce', 'Peppers', 'Herbs', 'Cucumbers', 'Spinach'];
  
  // Generate data for multiple months (from Jan 2024 to Dec 2025)
  const startYear = 2024;
  const endYear = 2025;
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // 20% chance of having activities on any given day
        if (Math.random() > 0.8) {
          data[date] = [];
          const numActivities = Math.floor(Math.random() * 3) + 1; // 1-3 activities
          
          for (let i = 0; i < numActivities; i++) {
            const activity = activities[Math.floor(Math.random() * activities.length)];
            const plant = plants[Math.floor(Math.random() * plants.length)];
            const hour = Math.floor(Math.random() * 12) + 1;
            const minute = Math.floor(Math.random() * 60);
            const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
            
            data[date].push({
              activity,
              plant,
              time: `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`,
              notes: Math.random() > 0.7 ? generateRandomNote(activity) : ''
            });
          }
        }
      }
    }
  }
  
  // Add some specific predefined activities for current month (June 2025)
  const predefinedActivities = {
    '2025-06-01': [
      { activity: 'planted', plant: 'Tomatoes', time: '9:00 AM', notes: 'Started seedlings indoors' }
    ],
    '2025-06-03': [
      { activity: 'watered', plant: 'Basil', time: '7:30 AM', notes: '' },
      { activity: 'fertilized', plant: 'Carrots', time: '10:15 AM', notes: 'Used organic fertilizer' }
    ],
    '2025-06-08': [
      { activity: 'watered', plant: 'Lettuce', time: '8:00 AM', notes: '' }
    ],
    '2025-06-10': [
      { activity: 'harvested', plant: 'Carrots', time: '6:45 PM', notes: 'First harvest of the season!' },
      { activity: 'watered', plant: 'Tomatoes', time: '7:00 PM', notes: '' }
    ],
    '2025-06-15': [
      { activity: 'planted', plant: 'Basil', time: '2:30 PM', notes: 'Added more basil varieties' }
    ],
    '2025-06-20': [
      { activity: 'fertilized', plant: 'Peppers', time: '9:30 AM', notes: '' }
    ],
    '2025-06-22': [
      { activity: 'watered', plant: 'Herbs', time: '7:15 AM', notes: '' },
      { activity: 'harvested', plant: 'Lettuce', time: '6:30 PM', notes: 'Perfect for salad tonight' }
    ],
    '2025-06-25': [
      { activity: 'planted', plant: 'Cucumbers', time: '10:00 AM', notes: 'Transplanted from seedlings' }
    ]
  };
  
  // Override with predefined activities
  Object.assign(data, predefinedActivities);
  
  return data;
};

// Helper function to generate random notes
const generateRandomNote = (activity) => {
  const notes = {
    planted: ['Started from seeds', 'Transplanted from greenhouse', 'New variety', 'Replacement planting'],
    watered: ['Morning routine', 'Extra water due to heat', 'Deep watering', 'Light misting'],
    fertilized: ['Organic fertilizer', 'Compost added', 'Liquid fertilizer', 'Seasonal feeding'],
    harvested: ['Perfect ripeness', 'First harvest!', 'Good yield', 'Shared with neighbors']
  };
  
  const activityNotes = notes[activity] || ['Quick action'];
  return activityNotes[Math.floor(Math.random() * activityNotes.length)];
};

export const todayTasks = [
  { 
    id: 1, 
    task: 'Water tomato plants', 
    plant: 'Tomatoes', 
    type: 'watered', 
    urgent: true 
  },
  { 
    id: 2, 
    task: 'Fertilize carrot bed', 
    plant: 'Carrots', 
    type: 'fertilized', 
    urgent: false 
  },
  { 
    id: 3, 
    task: 'Check pest damage on lettuce', 
    plant: 'Lettuce', 
    type: 'inspection', 
    urgent: true 
  }
];

export const upcomingTasks = [
  { 
    id: 4, 
    task: 'Harvest basil leaves', 
    plant: 'Basil', 
    date: 'Tomorrow', 
    type: 'harvested' 
  },
  { 
    id: 5, 
    task: 'Plant new lettuce seeds', 
    plant: 'Lettuce', 
    date: 'Jun 30', 
    type: 'planted' 
  },
  { 
    id: 6, 
    task: 'Water pepper plants', 
    plant: 'Peppers', 
    date: 'July 1', 
    type: 'watered' 
  },
  { 
    id: 7, 
    task: 'Harvest tomatoes', 
    plant: 'Tomatoes', 
    date: 'July 5', 
    type: 'harvested' 
  },
  { 
    id: 8, 
    task: 'Prune herb garden', 
    plant: 'Herbs', 
    date: 'July 8', 
    type: 'maintenance' 
  },
  { 
    id: 9, 
    task: 'Start fall planting prep', 
    plant: 'Carrots',
    date: 'July 15',
    type: 'planned'
  }
  ];