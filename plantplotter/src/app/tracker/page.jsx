'use client';
import React, { useState, useEffect } from 'react';
import { Sprout } from 'lucide-react';
import GardenSelector from '@/components/Tracker/GardenSelector';
import QuickActions from '@/components/Tracker/QuickActions';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import TasksList from '@/components/Tracker/TasksList';
import ActivityModal from '@/components/Tracker/ActivityModal';
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

export default function TrackingPage() {
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

  // Load gardens from the API
  useEffect(() => {
    loadGardens();
  }, []);

  // Load tasks when garden changes
  useEffect(() => {
    if (selectedGarden) {
      resetTaskDatabase();
      loadTasks();
    }
  }, [selectedGarden]);

  const loadGardens = async () => {
    try {
      // Try to load from API first
      const gardens = await apiClient.getGardens();
      console.log('Loaded gardens from API:', gardens);
      
      // Transform gardens for tracker format
      const trackerGardens = gardens.map(garden => ({
        id: garden.id,
        name: garden.name,
        icon: getGardenIcon(garden),
        plantCount: garden.plantCount || garden.plantedItems?.length || 0,
        status: garden.status || 'Active',
        location: garden.location || 'Unknown'
      }));
      
      setGardens(trackerGardens);
      if (trackerGardens.length > 0 && !selectedGarden) {
        setSelectedGarden(trackerGardens[0]);
      }
    } catch (error) {
      console.error('Failed to load gardens from API:', error);
      
      // Fallback to localStorage
      try {
        const localGardens = JSON.parse(localStorage.getItem('gardens') || '[]');
        console.log('Loaded gardens from localStorage as fallback:', localGardens);
        
        const trackerGardens = localGardens.map(garden => ({
          id: garden.id,
          name: garden.name,
          icon: getGardenIcon(garden),
          plantCount: garden.plantCount || garden.plantedItems?.length || 0,
          status: garden.status || 'Active',
          location: garden.location || 'Unknown'
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
    
    console.log('Loading tasks for garden:', selectedGarden.name, selectedGarden.id);
    const today = getTodayTasks(selectedGarden.id);
    const upcoming = getUpcomingTasks(selectedGarden.id);
    console.log('Today tasks loaded:', today);
    console.log('Upcoming tasks loaded:', upcoming);
    setTodayTasks(today);
    setUpcomingTasks(upcoming);
  };

  // Function to add activity to calendar when task is completed
  const addActivityToCalendar = (date, activityData) => {
    console.log('Adding activity to calendar:', date, activityData);
    const updatedCalendarData = addActivity(calendarData, date, activityData);
    setCalendarData(updatedCalendarData);
  };

  const handleTaskComplete = (taskId) => {
    console.log('Completing task:', taskId);
    
    // Complete the task and add activity to calendar
    const success = completeTask(taskId, addActivityToCalendar);
    
    if (success) {
      // Reload tasks to reflect the completed task
      loadTasks();
      
      // Show success message
      console.log(`Task ${taskId} completed successfully and added to calendar`);
      
      // You could add a toast notification here
      // showSuccessToast('Task completed and added to calendar!');
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
      
      await apiClient.addActivity(newActivityData);
      
      // Also add to local calendar data for immediate UI update
      const updatedCalendarData = addActivity(calendarData, selectedDate, newActivityData);
      setCalendarData(updatedCalendarData);
      
    } catch (error) {
      console.error('Failed to add activity via API:', error);
      
      // Fallback to local calendar data only
      const newActivityData = {
        ...activityData,
        gardenId: selectedGarden.id
      };
      
      const updatedCalendarData = addActivity(calendarData, selectedDate, newActivityData);
      setCalendarData(updatedCalendarData);
    }
    
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '', gardenId: null });
  };

  // Filter calendar data by selected garden
  const filteredCalendarData = selectedGarden ? 
    getActivitiesByGarden(calendarData, selectedGarden.id) : {};

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
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 space-y-6">
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
          <div className="flex-1">
            <TrackingCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              calendarData={filteredCalendarData}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            <WeatherWidget />
            <TasksList
              title="Today Tasks"
              tasks={todayTasks}
              onTaskComplete={handleTaskComplete}
              emptyMessage="No tasks for today"
            />
            <TasksList
              title="Upcoming Tasks"
              tasks={upcomingTasks}
              onTaskComplete={handleTaskComplete}
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
    </div>
  );
}