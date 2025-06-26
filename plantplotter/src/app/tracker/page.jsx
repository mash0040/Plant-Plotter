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
  gardens, 
  generateCalendarData, 
  addActivity,
  getActivitiesByGarden
} from '@/components/Tracker/Constants/TrackerData';
import { 
  getTodayTasks, 
  getUpcomingTasks, 
  completeTask ,
  resetTaskDatabase
} from '@/components/Tracker/Constants/TaskData';

export default function TrackingPage() {
  const [selectedGarden, setSelectedGarden] = useState(gardens[0]);
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

  // Load tasks when component mounts or garden changes
  useEffect(() => {
    // Reset task database to ensure we have current dates (useful for development)
    resetTaskDatabase();
    loadTasks();
  }, [selectedGarden]);

  const loadTasks = () => {
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
    setFormData({ 
      activity: action, 
      plant: '', 
      notes: '',
      gardenId: selectedGarden.id 
    });
    setShowForm(true);
  };

  const handleSubmitActivity = (activityData) => {
    const newActivityData = {
      ...activityData,
      gardenId: selectedGarden.id
    };
    
    const updatedCalendarData = addActivity(calendarData, selectedDate, newActivityData);
    setCalendarData(updatedCalendarData);
    
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '', gardenId: null });
  };

  // Filter calendar data by selected garden
  const filteredCalendarData = getActivitiesByGarden(calendarData, selectedGarden.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
      {showForm && (
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