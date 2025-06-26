'use client';
import React, { useState } from 'react';
import { Sprout } from 'lucide-react';
import GardenSelector from '@/components/Tracker/GardenSelector';
import QuickActions from '@/components/Tracker/QuickActions';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import TasksList from '@/components/Tracker/TasksList';
import ActivityModal from '@/components/Tracker/ActivityModal';
import { gardens, generateCalendarData, todayTasks, upcomingTasks } from '@/components/Tracker/Constants/TrackerData';

export default function TrackingPage() {
  const [selectedGarden, setSelectedGarden] = useState(gardens[0]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState(generateCalendarData());
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity: '',
    plant: '',
    notes: ''
  });

  const handleTaskComplete = (taskId) => {
    setCompletedTasks(prev => new Set([...prev, taskId]));
  };

  const handleQuickAction = (action) => {
    setFormData({ ...formData, activity: action });
    setShowForm(true);
  };

  const handleSubmitActivity = (activityData) => {
    const newActivity = {
      ...activityData,
      time: new Date().toLocaleTimeString()
    };
    
    const newCalendarData = { ...calendarData };
    if (!newCalendarData[selectedDate]) {
      newCalendarData[selectedDate] = [];
    }
    newCalendarData[selectedDate].push(newActivity);
    setCalendarData(newCalendarData);
    
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-2 max-w-7xl mx-auto">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 space-y-6">
            <GardenSelector 
              gardens={gardens}
              selectedGarden={selectedGarden}
              onGardenSelect={setSelectedGarden}
            />
            <QuickActions onQuickAction={handleQuickAction} />
          </div>

          {/* Main Calendar */}
          <div className="flex-1">
            <TrackingCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              calendarData={calendarData}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            <WeatherWidget />
            <TasksList
              title="Today Tasks"
              tasks={todayTasks}
              completedTasks={completedTasks}
              onTaskComplete={handleTaskComplete}
            />
            <TasksList
              title="Upcoming Tasks"
              tasks={upcomingTasks}
              completedTasks={completedTasks}
              onTaskComplete={handleTaskComplete}
              showCheckboxes={true}
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
        />
      )}
    </div>
  );
}