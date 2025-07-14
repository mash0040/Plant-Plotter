// Updated ActivitiesData.js - includes plants from your rich garden data
// Save this as: components/Tracker/Constants/ActivitiesData.js

export const activityTypes = [
  { id: 'planted', label: 'Planted', color: 'bg-green-200 text-green-800', icon: '🌱' },
  { id: 'watered', label: 'Watered', color: 'bg-blue-200 text-blue-800', icon: '💧' },
  { id: 'fertilized', label: 'Fertilized', color: 'bg-yellow-200 text-yellow-800', icon: '🌿' },
  { id: 'harvested', label: 'Harvested', color: 'bg-red-200 text-red-800', icon: '🌾' }
];

// Enhanced plant list based on your rich garden data
export const plantsList = [
  // Vegetables from your gardens
  'Tomato',
  'Lettuce', 
  'Carrot',
  'Radish',
  'Bell Pepper',
  'Spinach',
  'Broccoli',
  'Cucumber',
  'Zucchini',
  
  // Herbs from your gardens
  'Basil',
  'Oregano',
  'Parsley',
  'Cilantro',
  'Thyme',
  'Rosemary',
  'Mint',
  
  // Fruits from your gardens
  'Strawberry',
  'Blueberry',
  'Raspberry',
  'Apple Tree',
  'Pear Tree',
  'Cherry Tree',
  'Peach Tree',
  'Fig Tree',
  
  // Flowers from your gardens
  'Marigold',
  'Nasturtium',
  'Lavender',
  'Rose Bush',
  
  // Additional common plants
  'Beans',
  'Peas',
  'Kale',
  'Onion'
];

// Garden-specific plant suggestions based on your rich data
export const gardenPlants = {
  1: [ // Main Vegetable Garden
    'Tomato',
    'Basil',
    'Lettuce',
    'Carrot',
    'Radish',
    'Bell Pepper',
    'Oregano',
    'Spinach',
    'Broccoli',
    'Parsley',
    'Cucumber',
    'Zucchini',
    'Marigold',
    'Nasturtium',
    'Cilantro'
  ],
  2: [ // Mixed Berry & Flower Garden
    'Strawberry',
    'Blueberry',
    'Raspberry',
    'Lavender',
    'Rose Bush',
    'Marigold',
    'Thyme',
    'Rosemary'
  ],
  3: [ // Culinary Herb Collection
    'Basil',
    'Oregano',
    'Thyme',
    'Rosemary',
    'Parsley',
    'Cilantro',
    'Mint',
    'Lavender'
  ],
  4: [ // Young Orchard
    'Apple Tree',
    'Pear Tree',
    'Cherry Tree',
    'Peach Tree',
    'Fig Tree',
    'Nasturtium'
  ],
  5: [ // Intensive Container Garden
    'Lettuce',
    'Spinach',
    'Radish',
    'Cilantro',
    'Basil',
    'Parsley',
    'Thyme',
    'Strawberry',
    'Bell Pepper',
    'Marigold',
    'Nasturtium'
  ]
};

// Function to get plants for a specific garden
export const getPlantsForGarden = (gardenId) => {
  return gardenPlants[gardenId] || plantsList;
};

// Enhanced predefined activities with plants from your gardens - Extended through September
export const predefinedActivities = {
  // JULY 2025
  '2025-07-14': [ // Today
    { 
      id: 1,
      activity: 'watered', 
      plant: 'Tomato', 
      time: '7:00 AM', 
      notes: 'Morning watering for main vegetable garden',
      gardenId: 1,
      createdAt: '2025-07-14T07:00:00Z'
    },
    { 
      id: 2,
      activity: 'harvested', 
      plant: 'Basil', 
      time: '6:30 PM', 
      notes: 'Fresh basil for dinner',
      gardenId: 3,
      createdAt: '2025-07-14T18:30:00Z'
    }
  ],
  '2025-07-13': [ // Yesterday
    { 
      id: 3,
      activity: 'planted', 
      plant: 'Lettuce', 
      time: '9:00 AM', 
      notes: 'Succession planting for continuous harvest',
      gardenId: 1,
      createdAt: '2025-07-13T09:00:00Z'
    }
  ],
  '2025-07-12': [
    { 
      id: 4,
      activity: 'fertilized', 
      plant: 'Strawberry', 
      time: '10:15 AM', 
      notes: 'Organic fertilizer for berry garden',
      gardenId: 2,
      createdAt: '2025-07-12T10:15:00Z'
    },
    { 
      id: 5,
      activity: 'watered', 
      plant: 'Rosemary', 
      time: '7:30 AM', 
      notes: 'Light watering for herb collection',
      gardenId: 3,
      createdAt: '2025-07-12T07:30:00Z'
    }
  ],
  '2025-07-10': [
    { 
      id: 6,
      activity: 'harvested', 
      plant: 'Carrot', 
      time: '6:45 PM', 
      notes: 'Perfect size carrots ready!',
      gardenId: 1,
      createdAt: '2025-07-10T18:45:00Z'
    },
    { 
      id: 7,
      activity: 'watered', 
      plant: 'Apple Tree', 
      time: '7:00 PM', 
      notes: 'Deep watering for young orchard',
      gardenId: 4,
      createdAt: '2025-07-10T19:00:00Z'
    }
  ],
  '2025-07-08': [
    { 
      id: 8,
      activity: 'planted', 
      plant: 'Cilantro', 
      time: '2:30 PM', 
      notes: 'Added to container garden',
      gardenId: 5,
      createdAt: '2025-07-08T14:30:00Z'
    }
  ],
  '2025-07-05': [
    { 
      id: 9,
      activity: 'fertilized', 
      plant: 'Bell Pepper', 
      time: '9:30 AM', 
      notes: 'Calcium boost for better fruit set',
      gardenId: 1,
      createdAt: '2025-07-05T09:30:00Z'
    }
  ],
  '2025-07-03': [
    { 
      id: 10,
      activity: 'watered', 
      plant: 'Lavender', 
      time: '7:15 AM', 
      notes: 'Light watering - drought tolerant',
      gardenId: 2,
      createdAt: '2025-07-03T07:15:00Z'
    },
    { 
      id: 11,
      activity: 'harvested', 
      plant: 'Spinach', 
      time: '6:30 PM', 
      notes: 'Baby spinach for salads',
      gardenId: 5,
      createdAt: '2025-07-03T18:30:00Z'
    }
  ],
  '2025-07-01': [
    { 
      id: 12,
      activity: 'planted', 
      plant: 'Nasturtium', 
      time: '10:00 AM', 
      notes: 'Companion planting around fruit trees',
      gardenId: 4,
      createdAt: '2025-07-01T10:00:00Z'
    }
  ],

  // AUGUST 2025
  '2025-08-30': [
    { 
      id: 13,
      activity: 'harvested', 
      plant: 'Tomato', 
      time: '8:00 AM', 
      notes: 'Peak harvest season - plenty of ripe tomatoes!',
      gardenId: 1,
      createdAt: '2025-08-30T08:00:00Z'
    },
    { 
      id: 14,
      activity: 'watered', 
      plant: 'Bell Pepper', 
      time: '6:30 PM', 
      notes: 'Extra water during hot August weather',
      gardenId: 1,
      createdAt: '2025-08-30T18:30:00Z'
    }
  ],
  '2025-08-28': [
    { 
      id: 15,
      activity: 'fertilized', 
      plant: 'Cucumber', 
      time: '9:15 AM', 
      notes: 'Liquid fertilizer for heavy producing vines',
      gardenId: 1,
      createdAt: '2025-08-28T09:15:00Z'
    }
  ],
  '2025-08-25': [
    { 
      id: 16,
      activity: 'harvested', 
      plant: 'Zucchini', 
      time: '7:30 AM', 
      notes: 'Daily harvest to keep plants producing',
      gardenId: 1,
      createdAt: '2025-08-25T07:30:00Z'
    },
    { 
      id: 17,
      activity: 'watered', 
      plant: 'Strawberry', 
      time: '8:00 PM', 
      notes: 'Evening watering to avoid heat stress',
      gardenId: 2,
      createdAt: '2025-08-25T20:00:00Z'
    }
  ],
  '2025-08-22': [
    { 
      id: 18,
      activity: 'planted', 
      plant: 'Spinach', 
      time: '6:00 AM', 
      notes: 'Fall planting for cool weather crop',
      gardenId: 5,
      createdAt: '2025-08-22T06:00:00Z'
    }
  ],
  '2025-08-20': [
    { 
      id: 19,
      activity: 'harvested', 
      plant: 'Blueberry', 
      time: '7:45 AM', 
      notes: 'Late summer blueberry harvest',
      gardenId: 2,
      createdAt: '2025-08-20T07:45:00Z'
    },
    { 
      id: 20,
      activity: 'fertilized', 
      plant: 'Apple Tree', 
      time: '5:30 PM', 
      notes: 'Fall feeding for fruit trees',
      gardenId: 4,
      createdAt: '2025-08-20T17:30:00Z'
    }
  ],
  '2025-08-18': [
    { 
      id: 21,
      activity: 'watered', 
      plant: 'Basil', 
      time: '7:00 AM', 
      notes: 'Keep herbs well watered in heat',
      gardenId: 3,
      createdAt: '2025-08-18T07:00:00Z'
    }
  ],
  '2025-08-15': [
    { 
      id: 22,
      activity: 'harvested', 
      plant: 'Oregano', 
      time: '6:15 PM', 
      notes: 'Drying herbs for winter storage',
      gardenId: 3,
      createdAt: '2025-08-15T18:15:00Z'
    },
    { 
      id: 23,
      activity: 'planted', 
      plant: 'Radish', 
      time: '8:30 AM', 
      notes: 'Quick growing fall crop',
      gardenId: 1,
      createdAt: '2025-08-15T08:30:00Z'
    }
  ],
  '2025-08-12': [
    { 
      id: 24,
      activity: 'watered', 
      plant: 'Lettuce', 
      time: '6:30 AM', 
      notes: 'Early morning watering before heat',
      gardenId: 5,
      createdAt: '2025-08-12T06:30:00Z'
    }
  ],
  '2025-08-10': [
    { 
      id: 25,
      activity: 'harvested', 
      plant: 'Raspberry', 
      time: '7:00 AM', 
      notes: 'Second flush of summer raspberries',
      gardenId: 2,
      createdAt: '2025-08-10T07:00:00Z'
    },
    { 
      id: 26,
      activity: 'fertilized', 
      plant: 'Rose Bush', 
      time: '6:00 PM', 
      notes: 'Late summer feeding for continued blooms',
      gardenId: 2,
      createdAt: '2025-08-10T18:00:00Z'
    }
  ],
  '2025-08-08': [
    { 
      id: 27,
      activity: 'planted', 
      plant: 'Lettuce', 
      time: '7:15 AM', 
      notes: 'Heat-resistant variety for late summer',
      gardenId: 1,
      createdAt: '2025-08-08T07:15:00Z'
    }
  ],
  '2025-08-05': [
    { 
      id: 28,
      activity: 'watered', 
      plant: 'Thyme', 
      time: '8:00 AM', 
      notes: 'Minimal water for Mediterranean herbs',
      gardenId: 3,
      createdAt: '2025-08-05T08:00:00Z'
    },
    { 
      id: 29,
      activity: 'harvested', 
      plant: 'Cucumber', 
      time: '7:30 PM', 
      notes: 'Perfect cucumbers for pickle making',
      gardenId: 1,
      createdAt: '2025-08-05T19:30:00Z'
    }
  ],
  '2025-08-03': [
    { 
      id: 30,
      activity: 'fertilized', 
      plant: 'Parsley', 
      time: '9:00 AM', 
      notes: 'Boost for continuous leaf production',
      gardenId: 3,
      createdAt: '2025-08-03T09:00:00Z'
    }
  ],
  '2025-08-01': [
    { 
      id: 31,
      activity: 'planted', 
      plant: 'Broccoli', 
      time: '6:45 AM', 
      notes: 'Fall planting for cool weather harvest',
      gardenId: 1,
      createdAt: '2025-08-01T06:45:00Z'
    },
    { 
      id: 32,
      activity: 'watered', 
      plant: 'Fig Tree', 
      time: '7:45 PM', 
      notes: 'Deep watering during fruit development',
      gardenId: 4,
      createdAt: '2025-08-01T19:45:00Z'
    }
  ],

  // SEPTEMBER 2025
  '2025-09-30': [
    { 
      id: 33,
      activity: 'harvested', 
      plant: 'Apple Tree', 
      time: '9:00 AM', 
      notes: 'First apple harvest of the season!',
      gardenId: 4,
      createdAt: '2025-09-30T09:00:00Z'
    },
    { 
      id: 34,
      activity: 'planted', 
      plant: 'Cilantro', 
      time: '4:00 PM', 
      notes: 'Cool weather cilantro planting',
      gardenId: 3,
      createdAt: '2025-09-30T16:00:00Z'
    }
  ],
  '2025-09-28': [
    { 
      id: 35,
      activity: 'fertilized', 
      plant: 'Strawberry', 
      time: '8:30 AM', 
      notes: 'Fall feeding for next spring production',
      gardenId: 2,
      createdAt: '2025-09-28T08:30:00Z'
    }
  ],
  '2025-09-25': [
    { 
      id: 36,
      activity: 'harvested', 
      plant: 'Pear Tree', 
      time: '10:15 AM', 
      notes: 'Perfect timing for pear harvest',
      gardenId: 4,
      createdAt: '2025-09-25T10:15:00Z'
    },
    { 
      id: 37,
      activity: 'watered', 
      plant: 'Spinach', 
      time: '7:00 AM', 
      notes: 'Fall spinach growing well',
      gardenId: 5,
      createdAt: '2025-09-25T07:00:00Z'
    }
  ],
  '2025-09-22': [
    { 
      id: 38,
      activity: 'planted', 
      plant: 'Radish', 
      time: '6:30 AM', 
      notes: 'Fall radish succession planting',
      gardenId: 5,
      createdAt: '2025-09-22T06:30:00Z'
    }
  ],
  '2025-09-20': [
    { 
      id: 39,
      activity: 'harvested', 
      plant: 'Cherry Tree', 
      time: '8:45 AM', 
      notes: 'Late variety cherry harvest',
      gardenId: 4,
      createdAt: '2025-09-20T08:45:00Z'
    },
    { 
      id: 40,
      activity: 'fertilized', 
      plant: 'Lavender', 
      time: '5:00 PM', 
      notes: 'Light fall feeding',
      gardenId: 2,
      createdAt: '2025-09-20T17:00:00Z'
    }
  ],
  '2025-09-18': [
    { 
      id: 41,
      activity: 'watered', 
      plant: 'Mint', 
      time: '7:30 AM', 
      notes: 'Keep mint moist in cooler weather',
      gardenId: 3,
      createdAt: '2025-09-18T07:30:00Z'
    }
  ],
  '2025-09-15': [
    { 
      id: 42,
      activity: 'harvested', 
      plant: 'Fig Tree', 
      time: '6:45 PM', 
      notes: 'Sweet autumn figs ready',
      gardenId: 4,
      createdAt: '2025-09-15T18:45:00Z'
    },
    { 
      id: 43,
      activity: 'planted', 
      plant: 'Lettuce', 
      time: '8:00 AM', 
      notes: 'Fall lettuce varieties',
      gardenId: 5,
      createdAt: '2025-09-15T08:00:00Z'
    }
  ],
  '2025-09-12': [
    { 
      id: 44,
      activity: 'fertilized', 
      plant: 'Broccoli', 
      time: '9:30 AM', 
      notes: 'Boost for fall harvest',
      gardenId: 1,
      createdAt: '2025-09-12T09:30:00Z'
    }
  ],
  '2025-09-10': [
    { 
      id: 45,
      activity: 'watered', 
      plant: 'Marigold', 
      time: '7:15 AM', 
      notes: 'Keep flowers blooming through fall',
      gardenId: 1,
      createdAt: '2025-09-10T07:15:00Z'
    },
    { 
      id: 46,
      activity: 'harvested', 
      plant: 'Rosemary', 
      time: '6:30 PM', 
      notes: 'Fresh rosemary for cooking',
      gardenId: 3,
      createdAt: '2025-09-10T18:30:00Z'
    }
  ],
  '2025-09-08': [
    { 
      id: 47,
      activity: 'planted', 
      plant: 'Parsley', 
      time: '7:45 AM', 
      notes: 'Overwinter parsley planting',
      gardenId: 3,
      createdAt: '2025-09-08T07:45:00Z'
    }
  ],
  '2025-09-05': [
    { 
      id: 48,
      activity: 'harvested', 
      plant: 'Peach Tree', 
      time: '8:30 AM', 
      notes: 'Late season peach varieties',
      gardenId: 4,
      createdAt: '2025-09-05T08:30:00Z'
    },
    { 
      id: 49,
      activity: 'watered', 
      plant: 'Bell Pepper', 
      time: '6:45 PM', 
      notes: 'Continue harvest into fall',
      gardenId: 1,
      createdAt: '2025-09-05T18:45:00Z'
    }
  ],
  '2025-09-03': [
    { 
      id: 50,
      activity: 'fertilized', 
      plant: 'Nasturtium', 
      time: '8:15 AM', 
      notes: 'Extend flowering season',
      gardenId: 4,
      createdAt: '2025-09-03T08:15:00Z'
    }
  ],
  '2025-09-01': [
    { 
      id: 51,
      activity: 'planted', 
      plant: 'Spinach', 
      time: '6:30 AM', 
      notes: 'Perfect timing for fall spinach',
      gardenId: 1,
      createdAt: '2025-09-01T06:30:00Z'
    },
    { 
      id: 52,
      activity: 'harvested', 
      plant: 'Basil', 
      time: '7:30 PM', 
      notes: 'Large harvest before first frost',
      gardenId: 3,
      createdAt: '2025-09-01T19:30:00Z'
    }
  ],

  // Keep some June entries for completeness
  '2025-06-28': [
    { 
      id: 53,
      activity: 'harvested', 
      plant: 'Strawberry', 
      time: '8:00 AM', 
      notes: 'Sweet summer strawberries!',
      gardenId: 2,
      createdAt: '2025-06-28T08:00:00Z'
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
    'Started indoors',
    'Succession planting'
  ],
  watered: [
    'Morning routine', 
    'Extra water due to heat', 
    'Deep watering', 
    'Light misting',
    'Drip irrigation',
    'Hand watering',
    'Evening watering'
  ],
  fertilized: [
    'Organic fertilizer', 
    'Compost added', 
    'Liquid fertilizer', 
    'Seasonal feeding',
    'Fish emulsion',
    'Bone meal',
    'Calcium boost'
  ],
  harvested: [
    'Perfect ripeness', 
    'First harvest!', 
    'Good yield', 
    'Shared with neighbors',
    'Peak season',
    'Just in time',
    'Ready for cooking'
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