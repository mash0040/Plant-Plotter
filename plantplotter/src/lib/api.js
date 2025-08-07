const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found in localStorage');
      }
      return token;
    }
    return null;
  }

  // Generic request method with improved debugging
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
      console.log('Request config:', {
        method: config.method || 'GET',
        headers: { ...config.headers, Authorization: token ? 'Bearer [REDACTED]' : 'None' },
        body: config.body ? JSON.parse(config.body) : 'None'
      });
      
      const response = await fetch(url, config);
            
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
          try {
            const textResponse = await response.text();
            console.warn('Error response as text:', textResponse);
            errorMessage = textResponse || errorMessage;
          } catch (textError) {
            console.warn('Failed to get text response:', textError);
          }
        }
        
        // Handle specific status codes
        switch (response.status) {
          case 401:
            console.log('Unauthorized - clearing auth data');
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
        console.warn('⚠️ Unexpected response structure:', response);
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
        console.warn(`Failed to fetch plants for garden ${id}:`, plantError);
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
      // Check if it's an object
      if (typeof gardenData.name === 'object' && gardenData.name !== null) {
        console.log('NAME IS AN OBJECT!');
      }
      
      // Check each character if it's a string
      if (typeof gardenData.name === 'string') {
        for (let i = 0; i < Math.min(gardenData.name.length, 20); i++) {
          console.log(`  [${i}]: "${gardenData.name[i]}" (charCode: ${gardenData.name.charCodeAt(i)})`);
        }
        
        // Check for hidden characters
        console.log('Name as hex bytes:', [...gardenData.name].map(c => c.charCodeAt(0).toString(16)).join(' '));
      }
      
      // Check all fields
      Object.entries(gardenData).forEach(([key, value]) => {
        console.log(`🔍 ${key}:`, {
          value: value,
          type: typeof value,
          length: typeof value === 'string' ? value.length : 'N/A',
          json: JSON.stringify(value)
        });
      });
            
      // Continue with your normal updateGarden code...
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
          console.warn('Plant saving failed, trying individual plant saves:', plantError.message);
          
          // Fallback: Clear plants first, then add individually
          try {
            await this.clearGardenPlants(garden.id);
          } catch (clearError) {
            console.warn('Could not clear existing plants:', clearError.message);
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
      } else {
        console.log('No plants to save');
      }
      
      return garden;
      
    } catch (error) {
      console.error('===== COMPLETE GARDEN SAVE FAILED =====');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Plant library methods
  async getPlantLibrary() {
    try {
      console.log('📚 Fetching plant library...');
      const plants = await this.request('/plants');
      console.log('✅ Plant library loaded:', plants);
      return plants;
    } catch (error) {
      console.error('❌ Failed to fetch plant library:', error);
      throw error;
    }
  }

  async updatePlant(plantId, plantData) {
    try {
      console.log('📝 Updating plant in library:', plantId, plantData);
      const response = await this.request(`/plants/${plantId}`, {
        method: 'PUT',
        body: JSON.stringify(plantData),
      });
      console.log('✅ Plant updated in library:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update plant in library:', error);
      throw error;
    }
  }

  async addPlantToLibrary(plantData) {
    try {
      console.log('🆕 Adding plant to library:', plantData);
      const response = await this.request('/plants', {
        method: 'POST',
        body: JSON.stringify(plantData),
      });
      console.log('✅ Plant added to library:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to add plant to library:', error);
      throw error;
    }
  }

  async deletePlantFromLibrary(plantId) {
    try {
      console.log('🗑️ Deleting plant from library:', plantId);
      const response = await this.request(`/plants/${plantId}`, {
        method: 'DELETE',
      });
      console.log('✅ Plant deleted from library:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to delete plant from library:', error);
      throw error;
    }
  }

  // Activity methods
  async addActivity(activityData) {
    try {
      console.log('📝 Adding activity:', activityData);
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
      console.log('✅ Activity added:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to add activity:', error);
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
      
      console.log('📚 Fetching activities:', url);
      const activities = await this.request(url);
      console.log('✅ Activities loaded:', activities);
      return activities;
    } catch (error) {
      console.error('❌ Failed to fetch activities:', error);
      throw error;
    }
  }

  async updateActivity(activityId, activityData) {
    try {
      console.log('📝 Updating activity:', activityId, activityData);
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
      console.log('✅ Activity updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update activity:', error);
      throw error;
    }
  }

  async deleteActivity(activityId) {
    try {
      console.log('🗑️ Deleting activity:', activityId);
      const response = await this.request(`/activities/${activityId}`, {
        method: 'DELETE',
      });
      console.log('✅ Activity deleted:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to delete activity:', error);
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
      
      console.log('📋 Fetching tasks:', url);
      const tasks = await this.request(url);
      console.log('✅ Tasks loaded:', tasks);
      return tasks;
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
      throw error;
    }
  }

  async createTask(taskData) {
    try {
      console.log('🆕 Creating task:', taskData);
      const response = await this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      console.log('✅ Task created:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(taskId, taskData) {
    try {
      console.log('📝 Updating task:', taskId, taskData);
      const response = await this.request(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      });
      console.log('✅ Task updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      console.log('🗑️ Deleting task:', taskId);
      const response = await this.request(`/tasks/${taskId}`, {
        method: 'DELETE',
      });
      console.log('✅ Task deleted:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
      throw error;
    }
  }

  // Preferences methods
  async updatePreferences(preferences) {
    try {
      console.log('⚙️ Updating user preferences:', preferences);
      console.log('⚙️ Request URL will be:', `${this.baseURL}/users/preferences`);
      console.log('⚙️ Auth token available:', !!this.getAuthToken());
      
      const response = await this.request('/users/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      console.log('✅ Preferences updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      console.log('👤 Updating user profile:', profileData);
      const response = await this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      console.log('✅ Profile updated:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      throw error;
    }
  }

  // Helper methods
  isAuthenticated() {
    const token = this.getAuthToken();
    const isAuth = !!token;
    console.log('🔑 Authentication check:', isAuth ? 'Authenticated' : 'Not authenticated');
    return isAuth;
  }

  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      console.log('👤 Current user:', user ? `${user.email} (ID: ${user.id})` : 'None');
      return user;
    }
    return null;
  }

  // Debug methods
  async testConnection() {
    try {
      console.log('🔗 Testing API connection...');
      const response = await fetch(`${this.baseURL}/health`);
      const isConnected = response.ok;
      console.log('🔗 API connection:', isConnected ? '✅ Connected' : '❌ Failed');
      return isConnected;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }

  async testGardensEndpoint() {
    try {
      console.log('🔗 Testing gardens endpoint...');
      const response = await fetch(`${this.baseURL}/gardens`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔗 Gardens endpoint status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Gardens endpoint test successful');
        console.log('📊 Gardens data preview:', {
          type: typeof data,
          isArray: Array.isArray(data),
          gardensKey: data.gardens ? `array with ${data.gardens.length} items` : 'not present',
          directArray: Array.isArray(data) ? `${data.length} items` : 'not array'
        });
        return true;
      } else {
        const errorText = await response.text();
        console.log('❌ Gardens endpoint failed:', errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Gardens endpoint test failed:', error);
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