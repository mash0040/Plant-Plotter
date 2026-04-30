'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';

export default function TrackingCalendar({ 
  selectedDate, 
  onDateSelect, 
  calendarData = {}, 
  taskData = {},
  onActivityEdit, 
  onActivityDelete 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [tempYear, setTempYear] = useState(currentDate.getFullYear());
  const [tempMonth, setTempMonth] = useState(currentDate.getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentMonth = months[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateString = (year, month, day) => {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const formatDateKeyForDisplay = (dateKey) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
    onDateSelect(formatDateString(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
    onDateSelect(formatDateString(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const handleMonthYearSelect = () => {
    const newDate = new Date(tempYear, tempMonth, 1);
    setCurrentDate(newDate);
    onDateSelect(formatDateString(tempYear, tempMonth, 1));
    setShowMonthYearPicker(false);
  };

  const getActivityColorClass = (activity) => {
    const colorMap = {
      'planted': 'bg-green-100 text-green-800',
      'watered': 'bg-blue-100 text-blue-800', 
      'fertilized': 'bg-yellow-100 text-yellow-800',
      'harvested': 'bg-orange-100 text-orange-800',
      'pruned': 'bg-purple-100 text-purple-800',
      'weeded': 'bg-emerald-100 text-emerald-800'
    };
    return colorMap[activity] || 'bg-gray-100 text-gray-800';
  };

  const truncatePlantName = (name, maxLength = 8) => {
    if (!name) return 'Unknown';
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  const getActivityIcon = (activity) => {
    switch (activity) {
      case 'planted': return 'Pl';
      case 'watered': return 'W';
      case 'fertilized': return 'F';
      case 'harvested': return 'H';
      case 'pruned': return 'Pr';
      case 'weeded': return 'We';
      default: return 'A';
    }
  };

  const getTaskIcon = (taskType) => {
    switch (taskType) {
      case 'water': return 'W';
      case 'fertilize': return 'F';
      case 'harvest': return 'H';
      case 'prune': return 'P';
      case 'weed': return '!';
      default: return 'T';
    }
  };

  const handleActivityEdit = (activity, e) => {
    e.stopPropagation();
    if (onActivityEdit) {
      onActivityEdit(activity);
    }
  };

  const handleActivityDelete = (activity, e) => {
    e.stopPropagation();
    if (onActivityDelete) {
      onActivityDelete(activity);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentYear, currentDate.getMonth());
    const days = [];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // Day headers
    dayNames.forEach(day => {
      days.push(
        <div key={day} className="p-2 text-center font-medium text-gray-600 dark:text-gray-400 text-sm">
          {day}
        </div>
      );
    });

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(currentYear, currentDate.getMonth(), day);
      const activities = calendarData[dateStr] || [];
      const tasks = taskData[dateStr] || [];
      const calendarItemsCount = activities.length + tasks.length;
      const isSelected = selectedDate === dateStr;
      const today = new Date();
      const isToday = day === today.getDate() && 
                     currentDate.getMonth() === today.getMonth() && 
                     currentYear === today.getFullYear();

      days.push(
        <div
          key={day}
          className={`p-1 min-h-[80px] border border-gray-200 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors relative ${
            isSelected ? 'bg-green-100 dark:bg-green-900 border-green-300' : ''
          } ${isToday ? 'ring-2 ring-green-500 ring-inset' : ''}`}
          onClick={() => onDateSelect(dateStr)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-green-600 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
            {day}
          </div>
          
          {calendarItemsCount > 0 && (
            <div className="space-y-1">
              {activities.slice(0, 2).map((activity, idx) => {
                const plantName = activity.plant || activity.plant_name || 'Unknown';
                const activityType = activity.activity || activity.activity_type || 'activity';
                const plantLabel = activity.plant_no_longer_planted
                  ? `${plantName} (no longer planted)`
                  : plantName;
                
                return (
                  <div
                    key={activity.id || `${dateStr}-${idx}`}
                    className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 ${getActivityColorClass(activityType)} truncate group relative`}
                    title={`${activityType} ${plantLabel} at ${activity.time || 'unknown time'}`}
                  >
                    <span className="text-[10px] font-semibold flex-shrink-0">{getActivityIcon(activityType)}</span>
                    <span className="truncate font-medium min-w-0">
                      {truncatePlantName(plantLabel, 10)}
                    </span>
                    
                    {activity.id && onActivityEdit && onActivityDelete && (
                      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex gap-1 ml-auto">
                        <button
                          onClick={(e) => handleActivityEdit(activity, e)}
                          className="rounded p-0.5 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit activity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleActivityDelete(activity, e)}
                          className="rounded p-0.5 text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {tasks.slice(0, Math.max(0, 2 - activities.slice(0, 2).length)).map((task) => (
                <div
                  key={`task-${task.id}`}
                  className="text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-indigo-100 text-indigo-800 truncate"
                  title={`${task.title || task.task} due ${task.dueDate}`}
                >
                  <span className="text-xs flex-shrink-0">{getTaskIcon(task.task_type || task.taskType)}</span>
                  <span className="truncate font-medium min-w-0">
                    {truncatePlantName(task.title || task.task || 'Task', 10)}
                  </span>
                </div>
              ))}
              
              {calendarItemsCount > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-center">
                  +{calendarItemsCount - 2} more
                </div>
              )}
            </div>
          )}
          
          {calendarItemsCount > 3 && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateActivities = calendarData[selectedDate] || [];
  const selectedDateTasks = taskData[selectedDate] || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Garden Tracking Calendar
          </h2>
          <div className="flex items-center space-x-2 relative">
            <button 
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => {
                  setTempYear(currentYear);
                  setTempMonth(currentDate.getMonth());
                  setShowMonthYearPicker(!showMonthYearPicker);
                }}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center space-x-1"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentMonth} {currentYear}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showMonthYearPicker && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[280px]">
                  <div className="flex space-x-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Year
                      </label>
                      <select
                        value={tempYear}
                        onChange={(e) => setTempYear(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Month
                      </label>
                      <select
                        value={tempMonth}
                        onChange={(e) => setTempMonth(parseInt(e.target.value))}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      >
                        {months.map((month, index) => (
                          <option key={index} value={index}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={handleMonthYearSelect}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Go
                    </button>
                    <button
                      onClick={() => setShowMonthYearPicker(false)}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="rounded bg-green-100 px-1 text-green-800">Pl</span>
            <span className="text-gray-600 dark:text-gray-400">Planted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-blue-100 px-1 text-blue-800">W</span>
            <span className="text-gray-600 dark:text-gray-400">Watered</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-yellow-100 px-1 text-yellow-800">F</span>
            <span className="text-gray-600 dark:text-gray-400">Fertilized</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-orange-100 px-1 text-orange-800">H</span>
            <span className="text-gray-600 dark:text-gray-400">Harvested</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-purple-100 px-1 text-purple-800">Pr</span>
            <span className="text-gray-600 dark:text-gray-400">Pruned</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded bg-emerald-100 px-1 text-emerald-800">We</span>
            <span className="text-gray-600 dark:text-gray-400">Weeded</span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-4 text-xs">
          <span className="rounded bg-indigo-100 px-1 text-indigo-800">T</span>
          <span className="text-gray-600 dark:text-gray-400">Pending Task</span>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {renderCalendar()}
        </div>
        
        {selectedDateActivities.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span>Date</span>
              Activities for {formatDateKeyForDisplay(selectedDate)}:
            </h4>
            <div className="space-y-2">
              {selectedDateActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 bg-white dark:bg-gray-600 rounded group">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                    {getActivityIcon(activity.activity || activity.activity_type)}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      <span className="capitalize">{activity.activity || activity.activity_type}</span> {activity.plant || activity.plant_name}
                      {activity.plant_no_longer_planted && (
                        <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-300">
                          (no longer planted)
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {activity.time}
                    </div>
                    {activity.notes && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                        "{activity.notes}"
                      </div>
                    )}
                  </div>
                  
                  {activity.id && onActivityEdit && onActivityDelete && (
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleActivityEdit(activity, e)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors rounded"
                        title="Edit activity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleActivityDelete(activity, e)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors rounded"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDateTasks.length > 0 && (
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span>T</span>
              Tasks for {formatDateKeyForDisplay(selectedDate)}:
            </h4>
            <div className="space-y-2">
              {selectedDateTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-2 bg-white dark:bg-gray-600 rounded">
                  <span className="text-sm text-indigo-700">{getTaskIcon(task.task_type || task.taskType)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {task.title || task.task}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {task.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
