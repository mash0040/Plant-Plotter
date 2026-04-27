const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class ApiClient {
  constructor() {
    if (!API_BASE_URL) {
      throw new Error('NEXT_PUBLIC_API_URL is required. See plantplotter/.env.local.example for local setup.');
    }

    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      return token;
    }
    return null;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
            
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          try {
            const textResponse = await response.text();
            errorMessage = textResponse || errorMessage;
          } catch (textError) {
            // Use default error message
          }
        }
        
        // Handle specific status codes
        switch (response.status) {
          case 401:
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
            }
            throw new Error('Authentication failed. Please log in again.');
          case 403:
            throw new Error('Access forbidden. You do not have permission.');
          case 404:
            throw new Error(`Resource not found: ${endpoint}`);
          case 500:
            throw new Error('Server error. Please try again later.');
          default:
            throw new Error(errorMessage);
        }
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        return { success: true };
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and server status.');
      }
      
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.token && typeof window !== 'undefined') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  // Register new user
  async register(name, email, password) {
    try {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username: name,
          email, 
          password 
        }),
      });

      if (response.token && typeof window !== 'undefined') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Get user profile with preferences
  async getProfile() {
    try {
      const response = await this.request('/users/profile', {
        method: 'GET'
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get gardens with complete plant data for authenticated user
  async getGardens() {
    try {      
      const response = await this.request('/gardens');
      
      // The backend now returns array directly (not wrapped in object)
      let gardens = [];
      
      if (Array.isArray(response)) {
        gardens = response;
      } else if (response && response.gardens && Array.isArray(response.gardens)) {
        // Fallback for old format
        gardens = response.gardens;
      } else {
        return [];
      }
            
      // Transform gardens to ensure consistent format for frontend
      const transformedGardens = gardens.map(garden => {
        return {
          id: garden.id,
          name: garden.name,
          description: garden.description || '',
          // Handle both possible dimension formats
          dimensions: {
            width: garden.width || garden.dimensions?.width || 10,
            height: garden.height || garden.dimensions?.height || 10
          },
          width: garden.width || garden.dimensions?.width || 10,
          height: garden.height || garden.dimensions?.height || 10,
          soilType: garden.soil_type || garden.soilType || 'Loamy',
          soil_type: garden.soil_type || garden.soilType || 'Loamy',
          location: garden.location || 'Garden',
          status: garden.status || 'Active',
          plantCount: garden.plant_count || garden.plantCount || garden.plantedItems?.length || 0,
          plant_count: garden.plant_count || garden.plantCount || garden.plantedItems?.length || 0,
          plantedItems: garden.plantedItems || [],
          created_at: garden.created_at || garden.createdAt,
          createdAt: garden.created_at || garden.createdAt,
          updated_at: garden.updated_at || garden.updatedAt,
          updatedAt: garden.updated_at || garden.updatedAt,
          summary: garden.summary || null
        };
      });
      
      return transformedGardens;
      
    } catch (error) {
      console.error('Failed to fetch gardens:', error);
      
      // Enhanced error handling
      if (error.message.includes('Authentication failed')) {
        this.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Please log in again');
      }
      
      if (error.message.includes('Network error')) {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      
      throw error;
    }
  }

  // Get single garden with complete plant data
  async getGarden(id) {
    try {      
      // Fetch garden basic data
      const garden = await this.request(`/gardens/${id}`);
      
      // Fetch planted items for this garden
      let plantedItems = [];
      try {
        const plants = await this.request(`/gardens/${id}/plants`);
        plantedItems = Array.isArray(plants) ? plants : [];
      } catch (plantError) {
        plantedItems = garden.plantedItems || [];
      }
      
      // Transform planted items to consistent format
      const transformedPlantedItems = plantedItems.map(item => ({
        id: item.id,
        plantId: item.plant_id,
        name: item.name,
        emoji: item.emoji,
        size: item.size || 1,
        xPosition: item.xPosition,
        yPosition: item.yPosition,
        plantedDate: item.plantedDate,
        notes: item.notes
      }));
      
      // Combine garden data with planted items
      const completeGarden = {
        ...garden,
        plantedItems: transformedPlantedItems,
        plant_count: transformedPlantedItems.length
      };
      
      return completeGarden;
      
    } catch (error) {
      console.error('Failed to fetch garden:', error);
      throw error;
    }
  }

  // Create garden for authenticated user
  async createGarden(gardenData) {
    try {      
      if (!gardenData.name) {
        throw new Error('Garden name is required');
      }
      if (!gardenData.width || !gardenData.height) {
        throw new Error('Garden dimensions (width and height) are required');
      }
      
      const response = await this.request('/gardens', {
        method: 'POST',
        body: JSON.stringify({
          name: gardenData.name,
          description: gardenData.description || '',
          width: gardenData.width || gardenData.dimensions?.width,
          height: gardenData.height || gardenData.dimensions?.height,
          soil_type: gardenData.soil_type || gardenData.soilType || 'Loamy',
          location: gardenData.location || 'Garden',
          status: gardenData.status || 'Planning'
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to create garden:', error);
      throw error;
    }
  }

  async updateGarden(id, gardenData) {
    try {      
      const response = await this.request(`/gardens/${id}`, {
        method: 'PUT',
        body: JSON.stringify(gardenData),
      });

      return response;
    } catch (error) {
      console.error('Failed to update garden:', error);
      throw error;
    }
  }

  async deleteGarden(id) {
    try {
      const response = await this.request(`/gardens/${id}`, {
        method: 'DELETE',
      });

      return response;
    } catch (error) {
      console.error('Failed to delete garden:', error);
      throw error;
    }
  }

  // Plant methods
  async getGardenPlants(gardenId) {
    try {
      const plantedItems = await this.request(`/gardens/${gardenId}/plants`);
      
      const transformedItems = Array.isArray(plantedItems) ? plantedItems.map(item => ({
        id: item.id,
        plantId: item.plant_id,
        name: item.name,
        emoji: item.emoji,
        size: item.size || 1,
        xPosition: item.xPosition,
        yPosition: item.yPosition,
        plantedDate: item.plantedDate,
        notes: item.notes
      })) : [];
      
      return transformedItems;
    } catch (error) {
      console.error('Failed to fetch garden plants:', error);
      throw error;
    }
  }

  async addPlantToGarden(gardenId, plantData) {
    try {
      const response = await this.request(`/gardens/${gardenId}/plants`, {
        method: 'POST',
        body: JSON.stringify({
          plant_id: plantData.plant_id || plantData.plantId,
          plant_name: plantData.plant_name || plantData.name,
          plant_emoji: plantData.plant_emoji || plantData.emoji,
          plant_size: plantData.plant_size || plantData.size,
          plant_category: plantData.plant_category || plantData.category,
          x_position: plantData.x_position || plantData.xPosition,
          y_position: plantData.y_position || plantData.yPosition,
          notes: plantData.notes
        }),
      });
      return response;
    } catch (error) {
      console.error('Failed to add plant:', error);
      throw error;
    }
  }

  async removePlantFromGarden(gardenId, plantId) {
    try {
      const response = await this.request(`/gardens/${gardenId}/plants/${plantId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Failed to remove plant:', error);
      throw error;
    }
  }

  // Add method to clear all plants from a garden
  async clearGardenPlants(gardenId) {
    try {
      const response = await this.request(`/gardens/${gardenId}/plants`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Failed to clear plants:', error);
      throw error;
    }
  }

  // Enhanced save complete garden method
  async saveCompleteGarden(gardenData, plantedItems = []) {
    try {      
      let garden;
      
      // Step 1: Save or update garden basic info
      if (gardenData.id) {
        garden = await this.updateGarden(gardenData.id, {
          name: gardenData.name,
          description: gardenData.description || '',
          width: gardenData.width || gardenData.dimensions?.width,
          height: gardenData.height || gardenData.dimensions?.height,
          soil_type: gardenData.soilType || gardenData.soil_type,
          location: gardenData.location,
          status: gardenData.status
        });
        
        // Extract the actual garden object from the response
        if (garden.garden) {
          garden = garden.garden;
        }
        
        // Ensure garden has ID
        if (!garden.id) {
          garden.id = gardenData.id;
        }
        
      } else {
        garden = await this.createGarden({
          name: gardenData.name,
          description: gardenData.description || '',
          width: gardenData.width || gardenData.dimensions?.width,
          height: gardenData.height || gardenData.dimensions?.height,
          soil_type: gardenData.soilType || 'Loamy',
          location: gardenData.location || 'Garden',
          status: gardenData.status || 'Active'
        });
      }
          
      // Step 2: Save plants if any
      if (plantedItems.length > 0) {        
        try {
          // Use the new complete save endpoint for plants
          const plantResponse = await this.request(`/gardens/${garden.id}/complete`, {
            method: 'PUT',
            body: JSON.stringify({ plantedItems }),
          });          
          
        } catch (plantError) {
          // Fallback: Clear plants first, then add individually
          try {
            await this.clearGardenPlants(garden.id);
          } catch (clearError) {
            // Continue even if clear fails
          }
          
          // Add plants individually
          let addedCount = 0;
          for (const plant of plantedItems) {
            try {
              await this.addPlantToGarden(garden.id, plant);
              addedCount++;
            } catch (error) {
              console.error(`Failed to add plant ${plant.plant_name}:`, error.message);
            }
          }          
        }
      }
      
      return garden;
      
    } catch (error) {
      console.error('Complete garden save failed:', error);
      throw error;
    }
  }

  // Plant library methods
  async getPlantLibrary() {
    try {
      const plants = await this.request('/plants');
      return plants;
    } catch (error) {
      console.error('Failed to fetch plant library:', error);
      throw error;
    }
  }

  async updatePlant(plantId, plantData) {
    try {
      const response = await this.request(`/plants/${plantId}`, {
        method: 'PUT',
        body: JSON.stringify(plantData),
      });
      return response;
    } catch (error) {
      console.error('Failed to update plant in library:', error);
      throw error;
    }
  }

  async addPlantToLibrary(plantData) {
    try {
      const response = await this.request('/plants', {
        method: 'POST',
        body: JSON.stringify(plantData),
      });
      return response;
    } catch (error) {
      console.error('Failed to add plant to library:', error);
      throw error;
    }
  }

  async deletePlantFromLibrary(plantId) {
    try {
      const response = await this.request(`/plants/${plantId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Failed to delete plant from library:', error);
      throw error;
    }
  }

  // Activity methods
  async addActivity(activityData) {
    try {
      const response = await this.request('/activities', {
        method: 'POST',
        body: JSON.stringify({
          garden_id: activityData.gardenId,
          activity_type: activityData.activity,
          plant_name: activityData.plant,
          notes: activityData.notes,
          activity_date: activityData.date
        }),
      });
      return response;
    } catch (error) {
      console.error('Failed to add activity:', error);
      throw error;
    }
  }

  async getActivities(gardenId = null, date = null) {
    try {
      let url = '/activities';
      const params = new URLSearchParams();
      
      if (gardenId) params.append('gardenId', gardenId);
      if (date) params.append('date', date);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const activities = await this.request(url);
      return activities;
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      throw error;
    }
  }

  async updateActivity(activityId, activityData) {
    try {
      const response = await this.request(`/activities/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify({
          garden_id: activityData.garden_id,
          activity_type: activityData.activity_type,
          plant_name: activityData.plant_name,
          notes: activityData.notes,
          activity_date: activityData.activity_date
        }),
      });
      return response;
    } catch (error) {
      console.error('Failed to update activity:', error);
      throw error;
    }
  }

  async deleteActivity(activityId) {
    try {
      const response = await this.request(`/activities/${activityId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Failed to delete activity:', error);
      throw error;
    }
  }

  // Task methods
  async getTasks(gardenId = null) {
    try {
      let url = '/tasks';
      if (gardenId) {
        url += `?gardenId=${gardenId}`;
      }
      
      const tasks = await this.request(url);
      return tasks;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      throw error;
    }
  }

  async createTask(taskData) {
    try {
      const response = await this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      return response;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(taskId, taskData) {
    try {
      const response = await this.request(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      });
      return response;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await this.request(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  // Preferences methods
  async updatePreferences(preferences) {
    try {
      const response = await this.request('/users/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      return response;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      return response;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  // Helper methods
  isAuthenticated() {
    const token = this.getAuthToken();
    return !!token;
  }

  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  // Debug methods
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  async testGardensEndpoint() {
    try {
      const response = await fetch(`${this.baseURL}/gardens`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Gardens endpoint test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export helper functions for backward compatibility
export const getGardenById = (id) => apiClient.getGarden(id);
export const getGardens = () => apiClient.getGardens();
export const createGarden = (gardenData) => apiClient.createGarden(gardenData);
export const updateGarden = (id, gardenData) => apiClient.updateGarden(id, gardenData);
export const deleteGarden = (id) => apiClient.deleteGarden(id);

export default apiClient;
