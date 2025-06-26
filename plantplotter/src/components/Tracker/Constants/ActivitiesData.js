// Activities-specific data and functions

export const activityTypes = [
  { id: 'planted', label: 'Planted', color: 'bg-green-200 text-green-800', icon: '🌱' },
  { id: 'watered', label: 'Watered', color: 'bg-blue-200 text-blue-800', icon: '💧' },
  { id: 'fertilized', label: 'Fertilized', color: 'bg-yellow-200 text-yellow-800', icon: '🌿' },
  { id: 'harvested', label: 'Harvested', color: 'bg-red-200 text-red-800', icon: '🌾' }
];

export const plantsList = [
  'Tomatoes',
  'Carrots', 
  'Basil',
  'Lettuce',
  'Peppers',
  'Herbs',
  'Cucumbers',
  'Spinach',
  'Radishes',
  'Beans',
  'Peas',
  'Kale',
  'Cilantro',
  'Parsley',
  'Mint'
];

// Garden-specific plant suggestions
export const gardenPlants = {
  1: [ // Herb Garden
    'Basil',
    'Herbs',
    'Cilantro',
    'Parsley',
    'Mint',
    'Oregano',
    'Thyme',
    'Rosemary'
  ],
  2: [ // Fruit Garden
    'Tomatoes',
    'Peppers',
    'Strawberries',
    'Blueberries',
    'Raspberries'
  ],
  3: [ // Vegetable Garden
    'Carrots',
    'Lettuce',
    'Cucumbers',
    'Spinach',
    'Radishes',
    'Beans',
    'Peas',
    'Kale',
    'Broccoli',
    'Onions'
  ]
};

// Function to get plants for a specific garden
export const getPlantsForGarden = (gardenId) => {
  return gardenPlants[gardenId] || plantsList;
};

// Predefined activities with proper structure
export const predefinedActivities = {
  '2025-06-01': [
    { 
      id: 1,
      activity: 'planted', 
      plant: 'Tomatoes', 
      time: '9:00 AM', 
      notes: 'Started seedlings indoors',
      gardenId: 3,
      createdAt: '2025-06-01T09:00:00Z'
    }
  ],
  '2025-06-03': [
    { 
      id: 2,
      activity: 'watered', 
      plant: 'Basil', 
      time: '7:30 AM', 
      notes: '',
      gardenId: 1,
      createdAt: '2025-06-03T07:30:00Z'
    },
    { 
      id: 3,
      activity: 'fertilized', 
      plant: 'Carrots', 
      time: '10:15 AM', 
      notes: 'Used organic fertilizer',
      gardenId: 3,
      createdAt: '2025-06-03T10:15:00Z'
    }
  ],
  '2025-06-08': [
    { 
      id: 4,
      activity: 'watered', 
      plant: 'Lettuce', 
      time: '8:00 AM', 
      notes: '',
      gardenId: 3,
      createdAt: '2025-06-08T08:00:00Z'
    }
  ],
  '2025-06-10': [
    { 
      id: 5,
      activity: 'harvested', 
      plant: 'Carrots', 
      time: '6:45 PM', 
      notes: 'First harvest of the season!',
      gardenId: 3,
      createdAt: '2025-06-10T18:45:00Z'
    },
    { 
      id: 6,
      activity: 'watered', 
      plant: 'Tomatoes', 
      time: '7:00 PM', 
      notes: '',
      gardenId: 3,
      createdAt: '2025-06-10T19:00:00Z'
    }
  ],
  '2025-06-15': [
    { 
      id: 7,
      activity: 'planted', 
      plant: 'Basil', 
      time: '2:30 PM', 
      notes: 'Added more basil varieties',
      gardenId: 1,
      createdAt: '2025-06-15T14:30:00Z'
    }
  ],
  '2025-06-20': [
    { 
      id: 8,
      activity: 'fertilized', 
      plant: 'Peppers', 
      time: '9:30 AM', 
      notes: '',
      gardenId: 3,
      createdAt: '2025-06-20T09:30:00Z'
    }
  ],
  '2025-06-22': [
    { 
      id: 9,
      activity: 'watered', 
      plant: 'Herbs', 
      time: '7:15 AM', 
      notes: '',
      gardenId: 1,
      createdAt: '2025-06-22T07:15:00Z'
    },
    { 
      id: 10,
      activity: 'harvested', 
      plant: 'Lettuce', 
      time: '6:30 PM', 
      notes: 'Perfect for salad tonight',
      gardenId: 3,
      createdAt: '2025-06-22T18:30:00Z'
    }
  ],
  '2025-06-25': [
    { 
      id: 11,
      activity: 'planted', 
      plant: 'Cucumbers', 
      time: '10:00 AM', 
      notes: 'Transplanted from seedlings',
      gardenId: 3,
      createdAt: '2025-06-25T10:00:00Z'
    }
  ],
  '2025-05-15': [
    { 
      id: 12,
      activity: 'planted', 
      plant: 'Beans', 
      time: '11:00 AM', 
      notes: 'Started spring planting',
      gardenId: 3,
      createdAt: '2025-05-15T11:00:00Z'
    }
  ],
  '2025-07-04': [
    { 
      id: 13,
      activity: 'harvested', 
      plant: 'Tomatoes', 
      time: '8:00 AM', 
      notes: 'Perfect for 4th of July salad',
      gardenId: 3,
      createdAt: '2025-07-04T08:00:00Z'
    }
  ]
};

// Activity note templates
export const activityNotes = {
  planted: [
    'Started from seeds', 
    'Transplanted from greenhouse', 
    'New variety', 
    'Replacement planting',
    'Direct sowed',
    'Started indoors'
  ],
  watered: [
    'Morning routine', 
    'Extra water due to heat', 
    'Deep watering', 
    'Light misting',
    'Drip irrigation',
    'Hand watering'
  ],
  fertilized: [
    'Organic fertilizer', 
    'Compost added', 
    'Liquid fertilizer', 
    'Seasonal feeding',
    'Fish emulsion',
    'Bone meal'
  ],
  harvested: [
    'Perfect ripeness', 
    'First harvest!', 
    'Good yield', 
    'Shared with neighbors',
    'Peak season',
    'Just in time'
  ]
};

// Helper functions for activities
export const getActivityColor = (activityType) => {
  const activity = activityTypes.find(a => a.id === activityType);
  return activity ? activity.color : 'bg-gray-200 text-gray-800';
};

export const getActivityIcon = (activityType) => {
  const activity = activityTypes.find(a => a.id === activityType);
  return activity ? activity.icon : '📝';
};

export const generateRandomNote = (activityType) => {
  const notes = activityNotes[activityType] || ['Quick action'];
  return notes[Math.floor(Math.random() * notes.length)];
};