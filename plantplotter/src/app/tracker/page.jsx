'use client';
import React, { useState, useEffect } from 'react';
import { Sprout } from 'lucide-react';
import GardenSelector from '@/components/Tracker/GardenSelector';
import QuickActions from '@/components/Tracker/QuickActions';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import DetailedWeatherModal from '@/components/Tracker/DetailedWeatherModal';
import TasksList from '@/components/Tracker/TasksList';
import ActivityModal from '@/components/Tracker/ActivityModal';
import TaskEditModal from '@/components/Tracker/TaskEditModal';
import ActivityEditModal from '@/components/Tracker/ActivityEditModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useWeather } from '@/hooks/useWeather'; 
import { 
  generateCalendarData, 
  addActivity,
  getActivitiesByGarden
} from '@/components/Tracker/Constants/TrackerData';
import { 
  getTodayTasks, 
  getUpcomingTasks, 
  completeTask,
  resetTaskDatabase
} from '@/components/Tracker/Constants/TaskData';
import apiClient from '@/lib/api';

function TrackingPageContent() {
  const [gardens, setGardens] = useState([]);
  const [selectedGarden, setSelectedGarden] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState(generateCalendarData());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity: '',
    plant: '',
    notes: '',
    gardenId: null
  });
  
  // Task state
  const [todayTasks, setTodayTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  
  // Edit modal states
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showActivityEditModal, setShowActivityEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  
  // Weather modal state
  const [showDetailedWeather, setShowDetailedWeather] = useState(false);
  
  // Get weather data for the detailed modal
  const { weatherData } = useWeather();

  // Load gardens from the API
  useEffect(() => {
    loadGardens();
  }, []);

  // Load tasks and activities when garden changes
  useEffect(() => {
    if (selectedGarden) {
      resetTaskDatabase();
      loadTasks();
      loadActivities();
    }
  }, [selectedGarden]);

  // Also load activities on initial page load
  useEffect(() => {
    if (selectedGarden) {
      loadActivities();
    }
  }, []);

  const loadGardens = async () => {
    try {
      // Try to load from API first
      const gardens = await apiClient.getGardens();
      
      // Transform gardens for tracker format
      const trackerGardens = gardens.map(garden => ({
        id: garden.id,
        name: garden.name,
        icon: getGardenIcon(garden),
        plantCount: garden.plantCount || garden.plantedItems?.length || 0,
        status: garden.status || 'Active',
        location: garden.location || 'Unknown',
        plantedItems: garden.plantedItems || []
      }));
      
      setGardens(trackerGardens);
      if (trackerGardens.length > 0 && !selectedGarden) {
        setSelectedGarden(trackerGardens[0]);
      }
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      if (error.status === 401) {
        setGardens([]);
        return;
      }
      
      // Fallback to localStorage
      try {
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        
        const trackerGardens = localGardens.map(garden => ({
          id: garden.id,
          name: garden.name,
          icon: getGardenIcon(garden),
          plantCount: garden.plantCount || garden.plantedItems?.length || 0,
          status: garden.status || 'Active',
          location: garden.location || 'Unknown',
          plantedItems: garden.plantedItems || []
        }));
        
        setGardens(trackerGardens);
        if (trackerGardens.length > 0 && !selectedGarden) {
          setSelectedGarden(trackerGardens[0]);
        }
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
        setGardens([]);
      }
    }
  };

  // Load activities from API
  const loadActivities = async () => {
    if (!selectedGarden) return;
    
    try {
      const activities = await apiClient.getActivities(selectedGarden.id);
      
      // Transform activities to calendar format
      const calendarActivities = {};
      activities.forEach(activity => {
        // Ensure proper date formatting - handle different date formats
        let dateKey;
        if (activity.activity_date) {
          // If it's already a date string, use it
          if (typeof activity.activity_date === 'string') {
            dateKey = activity.activity_date.split('T')[0]; // Remove time part if present
          } else {
            // If it's a Date object, format it
            dateKey = new Date(activity.activity_date).toISOString().split('T')[0];
          }
        } else {
          // Fallback to created_at date
          dateKey = new Date(activity.created_at).toISOString().split('T')[0];
        }
        
        if (!calendarActivities[dateKey]) {
          calendarActivities[dateKey] = [];
        }
        
        // Create time string from activity_time or created_at
        let timeString;
        if (activity.activity_time) {
          // If activity_time is in HH:MM:SS format, convert to display format
          timeString = activity.activity_time.substring(0, 5); // Get HH:MM
        } else {
          // Fallback to created_at time
          timeString = new Date(activity.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        calendarActivities[dateKey].push({
          id: activity.id,
          activity: activity.activity_type,
          plant: activity.plant_name || 'Unknown Plant',
          notes: activity.notes || '',
          time: timeString,
          activity_date: dateKey,
          activity_type: activity.activity_type,
          plant_name: activity.plant_name,
          garden_id: activity.garden_id
        });
      });
      
      setCalendarData(calendarActivities);
      
    } catch (error) {
      console.error('Failed to load activities:', error);
      // Keep existing calendar data or use empty
      setCalendarData({});
    }
  };

  // Helper function to get garden icon based on garden data
  const getGardenIcon = (garden) => {
    if (garden.plantedItems && garden.plantedItems.length > 0) {
      // Get the most common plant category
      const categories = garden.plantedItems.reduce((acc, plant) => {
        const category = plant.category || plant.plantCategory || 'other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      const mostCommon = Object.keys(categories).reduce((a, b) => 
        categories[a] > categories[b] ? a : b
      );
      
      // Return icon based on most common category
      switch (mostCommon) {
        case 'vegetables': return '🥕';
        case 'fruits': return '🍎';
        case 'herbs': return '🌿';
        case 'flowers': return '🌸';
        default: return '🌱';
      }
    }
    
    // Default icon based on garden name or location
    const name = garden.name?.toLowerCase() || '';
    const location = garden.location?.toLowerCase() || '';
    
    if (name.includes('herb') || location.includes('herb')) return '🌿';
    if (name.includes('vegetable') || location.includes('vegetable')) return '🥕';
    if (name.includes('fruit') || location.includes('fruit')) return '🍎';
    if (name.includes('flower') || location.includes('flower')) return '🌸';
    
    return '🌱'; // Default garden icon
  };

  const loadTasks = () => {
    if (!selectedGarden) return;
    
    const today = getTodayTasks(selectedGarden.id);
    const upcoming = getUpcomingTasks(selectedGarden.id);
    setTodayTasks(today);
    setUpcomingTasks(upcoming);
  };

  // Function to add activity to calendar when task is completed
  const addActivityToCalendar = (date, activityData) => {
    const updatedCalendarData = addActivity(calendarData, date, activityData);
    setCalendarData(updatedCalendarData);
  };

  const handleTaskComplete = (taskId) => {
    // Complete the task and add activity to calendar
    const success = completeTask(taskId, addActivityToCalendar);
    
    if (success) {
      // Reload tasks to reflect the completed task
      loadTasks();
    }
  };

  const handleQuickAction = (action) => {
    if (!selectedGarden) return;
    
    setFormData({ 
      activity: action, 
      plant: '', 
      notes: '',
      gardenId: selectedGarden.id 
    });
    setShowForm(true);
  };

  const handleSubmitActivity = async (activityData) => {
    if (!selectedGarden) return;
    
    try {
      // Try to add activity via API
      const newActivityData = {
        ...activityData,
        gardenId: selectedGarden.id,
        date: selectedDate
      };
      
      const savedActivity = await apiClient.addActivity(newActivityData);
      
      // Add to local calendar data for immediate UI update
      const activityForCalendar = {
        id: savedActivity.id,
        activity: activityData.activity,
        plant: activityData.plant,
        notes: activityData.notes,
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        activity_date: selectedDate,
        activity_type: activityData.activity,
        plant_name: activityData.plant,
        garden_id: selectedGarden.id
      };
      
      const updatedCalendarData = { ...calendarData };
      if (!updatedCalendarData[selectedDate]) {
        updatedCalendarData[selectedDate] = [];
      }
      updatedCalendarData[selectedDate].push(activityForCalendar);
      setCalendarData(updatedCalendarData);
      
    } catch (error) {
      console.error('Failed to add activity via API:', error);
      
      // Fallback to local calendar data only
      const newActivityData = {
        activity: activityData.activity,
        plant: activityData.plant,
        notes: activityData.notes,
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        gardenId: selectedGarden.id
      };
      
      const updatedCalendarData = addActivity(calendarData, selectedDate, newActivityData);
      setCalendarData(updatedCalendarData);
    }
    
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '', gardenId: null });
  };

  // Activity management functions
  const handleActivityEdit = (activity) => {
    setEditingActivity(activity);
    setShowActivityEditModal(true);
  };

  const handleActivityAdd = () => {
    setEditingActivity(null);
    setShowActivityEditModal(true);
  };

  const handleActivitySave = async (activityData) => {
    try {
      if (activityData.id) {
        // Update existing activity
        await apiClient.updateActivity(activityData.id, {
          activity_type: activityData.activity_type,
          plant_name: activityData.plant_name,
          notes: activityData.notes,
          activity_date: activityData.activity_date
        });
      } else {
        // Create new activity
        await apiClient.addActivity({
          gardenId: activityData.garden_id,
          activity: activityData.activity_type,
          plant: activityData.plant_name,
          notes: activityData.notes,
          date: activityData.activity_date
        });
      }
      
      // Reload activities to refresh calendar
      await loadActivities();
      
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw error;
    }
  };

  const handleActivityDelete = async (activity) => {
    if (!confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      await apiClient.deleteActivity(activity.id);
      
      // Remove from local calendar data for immediate UI update
      const updatedCalendarData = { ...calendarData };
      const activityDate = activity.activity_date || activity.date || selectedDate;
      
      if (updatedCalendarData[activityDate]) {
        updatedCalendarData[activityDate] = updatedCalendarData[activityDate].filter(
          a => a.id !== activity.id
        );
        
        // Remove the date entry if no activities left
        if (updatedCalendarData[activityDate].length === 0) {
          delete updatedCalendarData[activityDate];
        }
      }
      
      setCalendarData(updatedCalendarData);
      
    } catch (error) {
      console.error('Failed to delete activity:', error);
      alert('Failed to delete activity. Please try again.');
    }
  };

  // Task management functions
  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setShowTaskEditModal(true);
  };

  const handleTaskAdd = () => {
    setEditingTask(null);
    setShowTaskEditModal(true);
  };

  const handleTaskSave = async (taskData) => {
    try {
      if (taskData.id) {
        // Update existing task
        await apiClient.updateTask(taskData.id, taskData);
      } else {
        // Create new task
        await apiClient.createTask(taskData);
      }
      
      // Reload tasks
      loadTasks();
      
    } catch (error) {
      console.error('Failed to save task:', error);
      throw error;
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await apiClient.deleteTask(taskId);
      
      // Reload tasks
      loadTasks();
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  // Filter calendar data by selected garden
  const filteredCalendarData = selectedGarden ? calendarData : {};

  // Show empty state if no gardens
  if (gardens.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No gardens found</h3>
          <p className="text-gray-600 mb-6">
            You need to create at least one garden before you can start tracking activities.
          </p>
          <a
            href="/gardens"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <Sprout className="w-5 h-5" />
            Create Your First Garden
          </a>
        </div>
      </div>
    );
  }

  // Show loading state if gardens are loaded but no garden is selected
  if (!selectedGarden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 space-y-6">
            <GardenSelector 
              gardens={gardens}
              selectedGarden={selectedGarden}
              onGardenSelect={setSelectedGarden}
            />
            <QuickActions 
              onQuickAction={handleQuickAction}
              selectedGarden={selectedGarden}
            />
          </div>

          {/* Main Calendar */}
          <div className="w-full lg:flex-1 min-w-0">
            <TrackingCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              calendarData={filteredCalendarData}
              onActivityEdit={handleActivityEdit}
              onActivityDelete={handleActivityDelete}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Weather Widget - Now clickable for detailed view */}
            <div onClick={() => setShowDetailedWeather(true)} className="cursor-pointer">
              <WeatherWidget />
            </div>
            
            <TasksList
              title="Today Tasks"
              tasks={todayTasks}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={handleTaskAdd}
              emptyMessage="No tasks for today"
            />
            <TasksList
              title="Upcoming Tasks"
              tasks={upcomingTasks}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={handleTaskAdd}
              showCheckboxes={true}
              emptyMessage="No upcoming tasks"
            />
          </div>
        </div>
      </div>

      {/* Activity Form Modal */}
      {showForm && selectedGarden && (
        <ActivityModal
          isOpen={showForm}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmitActivity}
          onClose={() => setShowForm(false)}
          selectedGarden={selectedGarden}
        />
      )}

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={showTaskEditModal}
        onClose={() => {
          setShowTaskEditModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleTaskSave}
        onDelete={editingTask?.id ? handleTaskDelete : null}
        gardens={gardens}
      />

      {/* Activity Edit Modal */}
      <ActivityEditModal
        isOpen={showActivityEditModal}
        onClose={() => {
          setShowActivityEditModal(false);
          setEditingActivity(null);
        }}
        activity={editingActivity}
        onSave={handleActivitySave}
        onDelete={editingActivity?.id ? handleActivityDelete : null}
        gardens={gardens}
        selectedGarden={selectedGarden}
      />

      {/* Detailed Weather Modal */}
      <DetailedWeatherModal
        isOpen={showDetailedWeather}
        onClose={() => setShowDetailedWeather(false)}
        weatherData={weatherData}
      />
    </div>
  );
}

export default function TrackingPage() {
  return (
    <ProtectedRoute>
      <TrackingPageContent />
    </ProtectedRoute>
  );
}
