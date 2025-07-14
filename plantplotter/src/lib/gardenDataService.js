// Garden Data Service - Centralized data management for gardens
// This service ensures consistency between garden management and tracking pages
// Save this file as: lib/gardenDataService.js

import { getGardens as getApiGardens } from './api';

// Storage key for localStorage
const GARDENS_STORAGE_KEY = 'gardens';

// Garden data service class
class GardenDataService {
  constructor() {
    this.listeners = [];
  }

  // Subscribe to garden data changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of data changes
  notify() {
    this.listeners.forEach(callback => callback());
  }

  // Get all gardens (from localStorage first, then API fallback)
  async getGardens() {
    try {
      // Try localStorage first
      const localGardens = localStorage.getItem(GARDENS_STORAGE_KEY);
      
      if (localGardens && localGardens !== '[]') {
        const parsedGardens = JSON.parse(localGardens);
        console.log('Loaded gardens from localStorage:', parsedGardens);
        return this.enrichGardenData(parsedGardens);
      } else {
        // Load from API (your rich mock data) and save to localStorage
        console.log('Loading gardens from API...');
        const apiGardens = await getApiGardens();
        console.log('API gardens loaded:', apiGardens);
        
        // Save the rich mock data to localStorage for future use
        this.saveToLocalStorage(apiGardens);
        return this.enrichGardenData(apiGardens);
      }
    } catch (error) {
      console.error('Failed to load gardens:', error);
      // If everything fails, try to return the API data directly
      try {
        const apiGardens = await getApiGardens();
        return this.enrichGardenData(apiGardens);
      } catch (apiError) {
        console.error('Failed to load from API:', apiError);
        return [];
      }
    }
  }

  // Save gardens to localStorage
  saveToLocalStorage(gardens) {
    try {
      localStorage.setItem(GARDENS_STORAGE_KEY, JSON.stringify(gardens));
      this.notify(); // Notify listeners of data change
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Add or update a garden
  async saveGarden(gardenData, isUpdate = false) {
    try {
      const gardens = await this.getGardens();
      let updatedGardens;

      if (isUpdate && gardenData.id) {
        // Update existing garden
        updatedGardens = gardens.map(g => 
          g.id === gardenData.id ? { ...gardenData, updatedAt: new Date().toISOString() } : g
        );
      } else {
        // Add new garden
        const newGarden = {
          ...gardenData,
          id: Date.now(), // Simple ID generation for demo
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          plantCount: gardenData.plantedItems?.length || 0
        };
        updatedGardens = [...gardens, newGarden];
      }

      this.saveToLocalStorage(updatedGardens);
      return isUpdate ? updatedGardens.find(g => g.id === gardenData.id) : updatedGardens[updatedGardens.length - 1];
    } catch (error) {
      console.error('Failed to save garden:', error);
      throw error;
    }
  }

  // Delete a garden
  async deleteGarden(gardenId) {
    try {
      const gardens = await this.getGardens();
      const updatedGardens = gardens.filter(g => g.id !== gardenId);
      this.saveToLocalStorage(updatedGardens);
      return true;
    } catch (error) {
      console.error('Failed to delete garden:', error);
      throw error;
    }
  }

  // Get garden by ID
  async getGardenById(gardenId) {
    try {
      const gardens = await this.getGardens();
      return gardens.find(g => g.id === parseInt(gardenId)) || null;
    } catch (error) {
      console.error('Failed to get garden by ID:', error);
      return null;
    }
  }

  // Update garden with planted items (for garden planner integration)
  async updateGardenPlants(gardenId, plantedItems) {
    try {
      const gardens = await this.getGardens();
      const gardenIndex = gardens.findIndex(g => g.id === gardenId);
      
      if (gardenIndex >= 0) {
        gardens[gardenIndex] = {
          ...gardens[gardenIndex],
          plantedItems: plantedItems,
          plantCount: plantedItems.length,
          updatedAt: new Date().toISOString()
        };
        
        this.saveToLocalStorage(gardens);
        return gardens[gardenIndex];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to update garden plants:', error);
      throw error;
    }
  }

  // Enrich garden data with computed properties
  enrichGardenData(gardens) {
    return gardens.map(garden => ({
      ...garden,
      // Ensure required properties exist
      plantedItems: garden.plantedItems || [],
      plantCount: garden.plantedItems?.length || garden.plantCount || 0,
      
      // Add tracker-specific properties
      trackerIcon: this.getGardenIcon(garden.name, garden.location),
      
      // Get unique plants for activity tracking
      availablePlants: this.getAvailablePlants(garden),
      
      // Calculate garden stats
      stats: this.calculateGardenStats(garden)
    }));
  }

  // Get appropriate icon for garden (used in tracker)
  getGardenIcon(name = '', location = '') {
    const nameUpper = name.toUpperCase();
    const locationUpper = location?.toUpperCase() || '';
    
    if (nameUpper.includes('HERB') || nameUpper.includes('SPICE')) return '🌿';
    if (nameUpper.includes('FRUIT') || nameUpper.includes('BERRY') || nameUpper.includes('ORCHARD')) return '🍎';
    if (nameUpper.includes('VEGETABLE') || nameUpper.includes('VEG')) return '🥕';
    if (nameUpper.includes('FLOWER') || nameUpper.includes('ROSE')) return '🌸';
    if (locationUpper.includes('BALCONY') || locationUpper.includes('CONTAINER')) return '🪴';
    if (locationUpper.includes('GREENHOUSE') || locationUpper.includes('INDOOR')) return '🏠';
    
    return '🌱'; // Default
  }

  // Get available plants from garden for activity tracking
  getAvailablePlants(garden) {
    const plants = [];
    
    // Add plants from plantedItems
    if (garden.plantedItems && garden.plantedItems.length > 0) {
      garden.plantedItems.forEach(item => {
        if (item.name && !plants.includes(item.name)) {
          plants.push(item.name);
        }
      });
    }
    
    // Add fallback plants based on garden type
    const fallbackPlants = this.getFallbackPlants(garden.name, garden.location);
    fallbackPlants.forEach(plant => {
      if (!plants.includes(plant)) {
        plants.push(plant);
      }
    });
    
    return plants.sort();
  }

  // Get fallback plants based on garden type
  getFallbackPlants(gardenName = '', location = '') {
    const nameUpper = gardenName.toUpperCase();
    const locationUpper = location?.toUpperCase() || '';
    
    if (nameUpper.includes('HERB') || nameUpper.includes('SPICE')) {
      return ['Basil', 'Cilantro', 'Parsley', 'Mint', 'Oregano', 'Thyme', 'Rosemary', 'Sage', 'Chives'];
    }
    
    if (nameUpper.includes('FRUIT') || nameUpper.includes('BERRY') || nameUpper.includes('ORCHARD')) {
      return ['Strawberry', 'Blueberry', 'Raspberry', 'Apple Tree', 'Pear Tree', 'Cherry Tree', 'Peach Tree', 'Tomato'];
    }
    
    if (nameUpper.includes('VEGETABLE') || nameUpper.includes('VEG')) {
      return ['Tomato', 'Lettuce', 'Carrot', 'Pepper', 'Cucumber', 'Spinach', 'Radish', 'Broccoli', 'Kale', 'Onion', 'Bean', 'Pea'];
    }
    
    if (nameUpper.includes('FLOWER') || nameUpper.includes('ROSE')) {
      return ['Rose', 'Marigold', 'Nasturtium', 'Lavender', 'Sunflower', 'Petunia', 'Tulip', 'Daffodil'];
    }
    
    if (locationUpper.includes('BALCONY') || locationUpper.includes('CONTAINER')) {
      return ['Lettuce', 'Spinach', 'Radish', 'Cherry Tomato', 'Pepper', 'Basil', 'Parsley', 'Cilantro', 'Strawberry'];
    }
    
    // Default mixed garden plants
    return ['Tomato', 'Lettuce', 'Basil', 'Pepper', 'Carrot', 'Spinach', 'Cucumber', 'Herbs', 'Flowers'];
  }

  // Calculate garden statistics
  calculateGardenStats(garden) {
    const plantedItems = garden.plantedItems || [];
    const categories = {};
    
    plantedItems.forEach(item => {
      const category = item.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return {
      totalPlants: plantedItems.length,
      categories,
      area: garden.dimensions ? (garden.dimensions.width * garden.dimensions.height) : 0,
      lastUpdated: garden.updatedAt
    };
  }

  // Reset all garden data (useful for development) - reloads fresh API data
  async resetData() {
    try {
      localStorage.removeItem(GARDENS_STORAGE_KEY);
      
      // Load fresh data from API and save it
      const apiGardens = await getApiGardens();
      this.saveToLocalStorage(apiGardens);
      
      this.notify();
      return apiGardens;
    } catch (error) {
      console.error('Failed to reset data:', error);
      localStorage.removeItem(GARDENS_STORAGE_KEY);
      this.notify();
    }
  }

  // Get gardens formatted for tracker component
  async getGardensForTracker() {
    const gardens = await this.getGardens();
    return gardens.map(garden => ({
      id: garden.id,
      name: garden.name,
      icon: garden.trackerIcon,
      location: garden.location,
      soilType: garden.soilType,
      dimensions: garden.dimensions,
      plantedItems: garden.plantedItems,
      availablePlants: garden.availablePlants
    }));
  }

  // Get plant categories for a garden
  getPlantCategories(garden) {
    const categories = {
      vegetables: [],
      herbs: [],
      fruits: [],
      flowers: [],
      other: []
    };

    if (garden.plantedItems) {
      garden.plantedItems.forEach(item => {
        const category = item.category || 'other';
        if (categories[category] && !categories[category].includes(item.name)) {
          categories[category].push(item.name);
        }
      });
    }

    return categories;
  }

  // Search gardens by various criteria
  async searchGardens(criteria) {
    const gardens = await this.getGardens();
    
    return gardens.filter(garden => {
      if (criteria.name && !garden.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.location && !garden.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        return false;
      }
      if (criteria.soilType && garden.soilType !== criteria.soilType) {
        return false;
      }
      if (criteria.status && garden.status !== criteria.status) {
        return false;
      }
      if (criteria.hasPlant && garden.plantedItems) {
        const hasPlant = garden.plantedItems.some(item => 
          item.name.toLowerCase().includes(criteria.hasPlant.toLowerCase())
        );
        if (!hasPlant) return false;
      }
      
      return true;
    });
  }

  // Get garden statistics across all gardens
  async getOverallStats() {
    const gardens = await this.getGardens();
    
    const stats = {
      totalGardens: gardens.length,
      totalPlants: 0,
      totalArea: 0,
      gardensByStatus: {},
      gardensByType: {},
      plantsByCategory: {},
      mostPopularPlants: {}
    };

    gardens.forEach(garden => {
      stats.totalPlants += garden.plantCount || 0;
      stats.totalArea += garden.stats?.area || 0;
      
      // Count by status
      const status = garden.status || 'unknown';
      stats.gardensByStatus[status] = (stats.gardensByStatus[status] || 0) + 1;
      
      // Count by type (based on name)
      const type = this.getGardenType(garden.name);
      stats.gardensByType[type] = (stats.gardensByType[type] || 0) + 1;
      
      // Count plants by category
      if (garden.plantedItems) {
        garden.plantedItems.forEach(item => {
          const category = item.category || 'other';
          stats.plantsByCategory[category] = (stats.plantsByCategory[category] || 0) + 1;
          
          const plantName = item.name;
          stats.mostPopularPlants[plantName] = (stats.mostPopularPlants[plantName] || 0) + 1;
        });
      }
    });

    return stats;
  }

  // Determine garden type from name
  getGardenType(name = '') {
    const nameUpper = name.toUpperCase();
    
    if (nameUpper.includes('HERB')) return 'herb';
    if (nameUpper.includes('FRUIT') || nameUpper.includes('BERRY') || nameUpper.includes('ORCHARD')) return 'fruit';
    if (nameUpper.includes('VEGETABLE') || nameUpper.includes('VEG')) return 'vegetable';
    if (nameUpper.includes('FLOWER')) return 'flower';
    if (nameUpper.includes('CONTAINER') || nameUpper.includes('BALCONY')) return 'container';
    
    return 'mixed';
  }
}

// Create and export singleton instance
const gardenDataService = new GardenDataService();

export default gardenDataService;

// Export convenience functions
export const getGardens = () => gardenDataService.getGardens();
export const saveGarden = (gardenData, isUpdate = false) => gardenDataService.saveGarden(gardenData, isUpdate);
export const deleteGarden = (gardenId) => gardenDataService.deleteGarden(gardenId);
export const getGardenById = (gardenId) => gardenDataService.getGardenById(gardenId);
export const updateGardenPlants = (gardenId, plantedItems) => gardenDataService.updateGardenPlants(gardenId, plantedItems);
export const getGardensForTracker = () => gardenDataService.getGardensForTracker();
export const subscribeToGardenChanges = (callback) => gardenDataService.subscribe(callback);
export const getOverallStats = () => gardenDataService.getOverallStats();