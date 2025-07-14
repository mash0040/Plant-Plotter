// Updated TrackerData.js - now uses the same rich garden data as api.js
// Save this as: components/Tracker/Constants/TrackerData.js

import { generateCalendarData, addActivity, getActivitiesByGarden } from './CalendarData';
import { activityTypes, plantsList, getPlantsForGarden } from './ActivitiesData';
import gardenDataService from '@/lib/gardenDataService';

// Use the same rich garden data as api.js for consistency
export const gardens = [
  {
    id: 1,
    name: "Main Vegetable Garden",
    icon: "🥕",
    location: "Backyard",
    soilType: "Loamy",
    dimensions: { width: 16, height: 12 },
    status: "Active",
    plantCount: 15,
    plantedItems: [
      { name: "Tomato", category: "vegetables" },
      { name: "Basil", category: "herbs" },
      { name: "Lettuce", category: "vegetables" },
      { name: "Carrot", category: "vegetables" },
      { name: "Radish", category: "vegetables" },
      { name: "Bell Pepper", category: "vegetables" },
      { name: "Oregano", category: "herbs" },
      { name: "Spinach", category: "vegetables" },
      { name: "Broccoli", category: "vegetables" },
      { name: "Parsley", category: "herbs" },
      { name: "Cucumber", category: "vegetables" },
      { name: "Zucchini", category: "vegetables" },
      { name: "Marigold", category: "flowers" },
      { name: "Nasturtium", category: "flowers" },
      { name: "Cilantro", category: "herbs" }
    ]
  },
  {
    id: 2,
    name: "Mixed Berry & Flower Garden",
    icon: "🍓",
    location: "Front yard",
    soilType: "Sandy Loam",
    dimensions: { width: 14, height: 10 },
    status: "Active",
    plantCount: 13,
    plantedItems: [
      { name: "Strawberry", category: "fruits" },
      { name: "Blueberry", category: "fruits" },
      { name: "Raspberry", category: "fruits" },
      { name: "Lavender", category: "flowers" },
      { name: "Rose Bush", category: "flowers" },
      { name: "Marigold", category: "flowers" },
      { name: "Thyme", category: "herbs" },
      { name: "Rosemary", category: "herbs" }
    ]
  },
  {
    id: 3,
    name: "Culinary Herb Collection",
    icon: "🌿",
    location: "Kitchen garden",
    soilType: "Well-drained Loam",
    dimensions: { width: 8, height: 8 },
    status: "Active",
    plantCount: 12,
    plantedItems: [
      { name: "Basil", category: "herbs" },
      { name: "Oregano", category: "herbs" },
      { name: "Thyme", category: "herbs" },
      { name: "Rosemary", category: "herbs" },
      { name: "Parsley", category: "herbs" },
      { name: "Cilantro", category: "herbs" },
      { name: "Mint", category: "herbs" },
      { name: "Lavender", category: "flowers" }
    ]
  },
  {
    id: 4,
    name: "Young Orchard",
    icon: "🍎",
    location: "Side yard",
    soilType: "Clay Loam",
    dimensions: { width: 20, height: 15 },
    status: "Active",
    plantCount: 11,
    plantedItems: [
      { name: "Apple Tree", category: "fruits" },
      { name: "Pear Tree", category: "fruits" },
      { name: "Cherry Tree", category: "fruits" },
      { name: "Peach Tree", category: "fruits" },
      { name: "Fig Tree", category: "fruits" },
      { name: "Nasturtium", category: "flowers" }
    ]
  },
  {
    id: 5,
    name: "Intensive Container Garden",
    icon: "🪴",
    location: "Apartment balcony",
    soilType: "Premium Potting Mix",
    dimensions: { width: 6, height: 4 },
    status: "Active",
    plantCount: 14,
    plantedItems: [
      { name: "Lettuce", category: "vegetables" },
      { name: "Spinach", category: "vegetables" },
      { name: "Radish", category: "vegetables" },
      { name: "Cilantro", category: "herbs" },
      { name: "Basil", category: "herbs" },
      { name: "Parsley", category: "herbs" },
      { name: "Thyme", category: "herbs" },
      { name: "Strawberry", category: "fruits" },
      { name: "Bell Pepper", category: "vegetables" },
      { name: "Marigold", category: "flowers" },
      { name: "Nasturtium", category: "flowers" }
    ]
  }
];

// Keep weather data as static for now
export const weatherData = {
  current: {
    temp: 24,
    condition: 'Sunny',
    humidity: 65,
    description: 'Light breeze'
  }
};

// Function to get gardens dynamically (with fallback to rich static data)
export const getGardens = async () => {
  try {
    const dynamicGardens = await gardenDataService.getGardensForTracker();
    // If we have user-created gardens, use those
    if (dynamicGardens && dynamicGardens.length > 0) {
      return dynamicGardens;
    }
    // Otherwise, use the rich static gardens as fallback
    return gardens;
  } catch (error) {
    console.error('Failed to load gardens for tracker:', error);
    // Return the rich static gardens as fallback
    return gardens;
  }
};

// Function to get garden by ID
export const getGardenById = async (gardenId) => {
  try {
    // Try dynamic first
    const dynamicGarden = await gardenDataService.getGardenById(gardenId);
    if (dynamicGarden) {
      return dynamicGarden;
    }
    // Fallback to static
    return gardens.find(g => g.id === gardenId);
  } catch (error) {
    console.error('Failed to get garden by ID:', error);
    return gardens.find(g => g.id === gardenId);
  }
};

// Enhanced function to get available plants for a garden
export const getPlantsForGardenDynamic = async (gardenId) => {
  try {
    // Try to get from dynamic garden first
    const garden = await gardenDataService.getGardenById(gardenId);
    if (garden && garden.availablePlants && garden.availablePlants.length > 0) {
      return garden.availablePlants;
    }
    
    // Fallback to static garden data
    const staticGarden = gardens.find(g => g.id === gardenId);
    if (staticGarden && staticGarden.plantedItems) {
      return staticGarden.plantedItems.map(item => item.name);
    }
    
    // Final fallback to general plant list
    return getPlantsForGarden(gardenId);
  } catch (error) {
    console.error('Failed to get plants for garden:', error);
    return plantsList;
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