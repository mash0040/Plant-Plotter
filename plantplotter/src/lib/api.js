const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
import {
  API_ERROR_CODES,
  ApiError,
  NETWORK_ERROR_MESSAGE,
  SERVER_ERROR_MESSAGE,
  SERVICE_UNAVAILABLE_MESSAGE,
  isServiceUnavailableError
} from './apiErrors';

class ApiClient {
  constructor() {
    if (!API_BASE_URL) {
      throw new Error('NEXT_PUBLIC_API_URL is required. See plantplotter/.env.local.example for local setup.');
    }

    this.baseURL = API_BASE_URL;
    this.plantLibraryCache = null;
  }

  clearUserSessionStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('gardens');
    }
  }

  notifyAuthExpired(error) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plantplotter:auth-expired', {
        detail: {
          message: error.message,
          code: error.code
        }
      }));
    }
  }

  getBestPlantCategory(item = {}) {
    return item.category || item.plant_category || item.type || item.plantType || null;
  }

  isServiceUnavailableError(error) {
    return isServiceUnavailableError(error);
  }

  buildApiError(response, errorData, fallbackMessage) {
    const apiMessage = errorData?.message || errorData?.error;
    const message = apiMessage || fallbackMessage;
    const errors = errorData?.errors || null;
    const code = errorData?.code || errorData?.error;

    switch (response.status) {
      case 400:
        return new ApiError(message || 'Please check your information and try again.', {
          status: 400,
          code: code || API_ERROR_CODES.VALIDATION_ERROR,
          errors
        });
      case 401:
        return new ApiError(message || 'Authentication required.', {
          status: 401,
          code: code || API_ERROR_CODES.AUTH_REQUIRED,
          errors
        });
      case 403:
        return new ApiError(message || 'Access forbidden. You do not have permission.', {
          status: 403,
          code: code || API_ERROR_CODES.FORBIDDEN,
          errors
        });
      case 404:
        return new ApiError(message || 'Resource not found.', {
          status: 404,
          code: code || API_ERROR_CODES.NOT_FOUND,
          errors
        });
      case 429:
        return new ApiError(message || 'Too many requests. Please try again later.', {
          status: 429,
          code: code || API_ERROR_CODES.RATE_LIMITED,
          errors,
          retryAfter: response.headers.get('Retry-After')
        });
      case 503:
        return new ApiError(message || SERVICE_UNAVAILABLE_MESSAGE, {
          status: 503,
          code: code || API_ERROR_CODES.SERVICE_UNAVAILABLE,
          errors,
          retryAfter: response.headers.get('Retry-After')
        });
      case 500:
        return new ApiError(SERVER_ERROR_MESSAGE, {
          status: 500,
          code: code || API_ERROR_CODES.SERVER_ERROR
        });
      default:
        return new ApiError(message || fallbackMessage, {
          status: response.status,
          code: code || API_ERROR_CODES.UNEXPECTED_ERROR,
          errors
        });
    }
  }

  transformPlantedItem(item = {}) {
    return {
      id: item.id,
      plantId: item.plant_id || item.plantId,
      name: item.name || item.plant_name,
      emoji: item.emoji || item.plant_emoji,
      size: item.size || item.plant_size || 1,
      category: this.getBestPlantCategory(item),
      type: item.type,
      xPosition: item.xPosition ?? item.x_position,
      yPosition: item.yPosition ?? item.y_position,
      plantedDate: item.plantedDate || item.planted_date || item.created_at,
      created_at: item.created_at || item.createdAt,
      updated_at: item.updated_at || item.updatedAt,
      notes: item.notes || ''
    };
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

        // /auth/login and /auth/register can return 401 for "Invalid credentials".
        // Those are user input errors, NOT session expirations — keep the server message
        // and don't trigger the session-expired flow.
        const isAuthEntryEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/register');

        const apiError = this.buildApiError(response, errorData, errorMessage);

        if (response.status === 401 && !isAuthEntryEndpoint) {
          const authError = new ApiError('Your session expired. Please sign in again.', {
            status: 401,
            code: apiError.code || API_ERROR_CODES.AUTH_REQUIRED,
            errors: apiError.errors
          });
          this.clearUserSessionStorage();
          this.notifyAuthExpired(authError);
          throw authError;
        }

        throw apiError;
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
        throw new ApiError(NETWORK_ERROR_MESSAGE, {
          status: 0,
          code: API_ERROR_CODES.NETWORK_ERROR,
          cause: error
        });
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
        this.clearUserSessionStorage();
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
    this.clearUserSessionStorage();
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
        this.clearUserSessionStorage();
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

  async forgotPassword(email) {
    try {
      return await this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error('Forgot password request failed:', error);
      throw error;
    }
  }

  async resetPassword(token, password, confirmPassword) {
    try {
      return await this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password, confirmPassword }),
      });
    } catch (error) {
      console.error('Password reset failed:', error);
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
          plantedItems: Array.isArray(garden.plantedItems)
            ? garden.plantedItems.map(item => this.transformPlantedItem(item))
            : [],
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
      
      throw error;
    }
  }

  // Get lightweight garden summaries without planted item records.
  async getGardenSummaries() {
    try {
      const response = await this.request('/gardens/summary');
      const gardens = Array.isArray(response) ? response : [];

      return gardens.map(garden => ({
        id: garden.id,
        name: garden.name,
        description: garden.description || '',
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
        plantCount: garden.plant_count || garden.plantCount || 0,
        plant_count: garden.plant_count || garden.plantCount || 0,
        plantedItems: [],
        created_at: garden.created_at || garden.createdAt,
        createdAt: garden.created_at || garden.createdAt,
        updated_at: garden.updated_at || garden.updatedAt,
        updatedAt: garden.updated_at || garden.updatedAt
      }));
    } catch (error) {
      console.error('Failed to fetch garden summaries:', error);
      throw error;
    }
  }

  // Get single garden with complete plant data
  async getGarden(id) {
    try {      
      const garden = await this.request(`/gardens/${id}`);
      let plantedItems = Array.isArray(garden.plantedItems) ? garden.plantedItems : [];

      if (!Array.isArray(garden.plantedItems)) {
        // Fallback for older backend responses that predate embedded plantedItems.
        const plants = await this.request(`/gardens/${id}/plants`);
        plantedItems = Array.isArray(plants) ? plants : [];
      }
      
      // Transform planted items to consistent format
      const transformedPlantedItems = plantedItems.map(item => this.transformPlantedItem(item));
      
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

      return response.garden || response;
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
      
      const transformedItems = Array.isArray(plantedItems)
        ? plantedItems.map(item => this.transformPlantedItem(item))
        : [];
      
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
          x_position: plantData.x_position ?? plantData.xPosition,
          y_position: plantData.y_position ?? plantData.yPosition,
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

  async saveGardenPlantedItems(gardenId, plantedItems = []) {
    try {
      return await this.request(`/gardens/${gardenId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ plantedItems }),
      });
    } catch (plantError) {
      if (this.isServiceUnavailableError(plantError)) {
        throw plantError;
      }

      await this.clearGardenPlants(gardenId);

      const failedPlants = [];
      for (const plant of plantedItems) {
        try {
          await this.addPlantToGarden(gardenId, plant);
        } catch (error) {
          if (this.isServiceUnavailableError(error)) {
            throw error;
          }

          console.error(`Failed to add plant ${plant.plant_name}:`, error.message);
          failedPlants.push(plant.plant_name || plant.plant_id || 'plant');
        }
      }

      if (failedPlants.length > 0) {
        throw new Error(`Failed to save ${failedPlants.length} planted item${failedPlants.length === 1 ? '' : 's'}.`);
      }

      return { success: true, totalPlants: plantedItems.length };
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
          if (this.isServiceUnavailableError(plantError)) {
            throw plantError;
          }

          // Fallback: Clear plants first, then add individually
          try {
            await this.clearGardenPlants(garden.id);
          } catch (clearError) {
            if (this.isServiceUnavailableError(clearError)) {
              throw clearError;
            }

            // Continue even if clear fails
          }
          
          // Add plants individually
          let addedCount = 0;
          for (const plant of plantedItems) {
            try {
              await this.addPlantToGarden(garden.id, plant);
              addedCount++;
            } catch (error) {
              if (this.isServiceUnavailableError(error)) {
                throw error;
              }

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
  async getPlantLibrary(options = {}) {
    try {
      if (!options.bypassCache && this.plantLibraryCache) {
        return this.plantLibraryCache;
      }

      const plants = await this.request('/plants');
      this.plantLibraryCache = plants;
      return plants;
    } catch (error) {
      console.error('Failed to fetch plant library:', error);
      throw error;
    }
  }

  clearPlantLibraryCache() {
    this.plantLibraryCache = null;
  }

  async updatePlant(plantId, plantData) {
    try {
      const response = await this.request(`/plants/${plantId}`, {
        method: 'PUT',
        body: JSON.stringify(plantData),
      });
      this.clearPlantLibraryCache();
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
      this.clearPlantLibraryCache();
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
      this.clearPlantLibraryCache();
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

  async deleteAccount() {
    try {
      const response = await this.request('/users/account', {
        method: 'DELETE',
      });
      this.clearUserSessionStorage();
      return response;
    } catch (error) {
      console.error('Failed to delete account:', error);
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
