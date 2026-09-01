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

  const getActivityDotColorClass = (activity) => {
    const colorMap = {
      'planted': 'bg-green-500',
      'watered': 'bg-blue-500',
      'fertilized': 'bg-yellow-500',
      'harvested': 'bg-orange-500',
      'pruned': 'bg-purple-500',
      'weeded': 'bg-emerald-500'
    };
    return colorMap[activity] || 'bg-gray-500';
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
      case 'inspect': return 'I';
      case 'treat': return 'Rx';
      case 'other': return 'O';
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
      const dateLabel = new Date(currentYear, currentDate.getMonth(), day).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      const today = new Date();
      const isToday = day === today.getDate() && 
                     currentDate.getMonth() === today.getMonth() && 
                     currentYear === today.getFullYear();

      days.push(
        <div
          key={day}
          className={`p-1 min-h-[58px] sm:min-h-[80px] border border-gray-200 dark:border-gray-700 transition-colors relative ${
            isSelected ? 'bg-green-100 dark:bg-green-900 border-green-300' : ''
          } ${isToday ? 'ring-2 ring-green-500 ring-inset' : ''}`}
        >
          <button
            type="button"
            onClick={() => onDateSelect(dateStr)}
            aria-label={`Select ${dateLabel}`}
            aria-pressed={isSelected}
            className="absolute inset-0 z-0 rounded-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-600 dark:hover:bg-gray-800"
          />
          <div className={`pointer-events-none relative z-10 text-sm font-medium mb-1 ${isToday ? 'text-green-600 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
            {day}
          </div>
          
          {calendarItemsCount > 0 && (
            <div className="pointer-events-none relative z-10 mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-label={`${calendarItemsCount} tracker item${calendarItemsCount === 1 ? '' : 's'}`}>
              {activities.slice(0, 3).map((activity, idx) => {
                const activityType = activity.activity || activity.activity_type || 'activity';
                return (
                  <span
                    key={activity.id || `${dateStr}-dot-${idx}`}
                    className={`h-1.5 w-1.5 rounded-full ${getActivityDotColorClass(activityType)}`}
                  />
                );
              })}
              {tasks.slice(0, Math.max(0, 3 - activities.slice(0, 3).length)).map((task) => (
                <span
                  key={`task-dot-${task.id}`}
                  className="h-1.5 w-1.5 rounded-full bg-indigo-500"
                />
              ))}
              {calendarItemsCount > 3 && (
                <span className="text-[10px] font-semibold leading-none text-gray-500">+</span>
              )}
            </div>
          )}

          {calendarItemsCount > 0 && (
            <div className="pointer-events-none relative z-10 hidden space-y-1 sm:block">
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
                      <div className="pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 flex gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={(e) => handleActivityEdit(activity, e)}
                          aria-label={`Edit ${activityType} activity for ${plantName}`}
                          className="rounded p-0.5 text-gray-600 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                          title="Edit activity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleActivityDelete(activity, e)}
                          aria-label={`Delete ${activityType} activity for ${plantName}`}
                          className="rounded p-0.5 text-gray-600 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
            <div className="pointer-events-none absolute top-1 right-1 z-10 w-2 h-2 bg-green-500 rounded-full"></div>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Garden Tracking Calendar
          </h2>
          <div className="relative flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <button 
              type="button"
              onClick={goToPreviousMonth}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => {
                  setTempYear(currentYear);
                  setTempMonth(currentDate.getMonth());
                  setShowMonthYearPicker(!showMonthYearPicker);
                }}
                aria-expanded={showMonthYearPicker}
                aria-controls="calendar-month-year-picker"
                className="flex min-h-10 w-full items-center justify-center gap-1 rounded px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 sm:w-auto sm:px-4"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentMonth} {currentYear}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showMonthYearPicker && (
                <div id="calendar-month-year-picker" className="absolute right-0 top-full mt-2 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
                  <div className="flex space-x-4 mb-4">
                    <div className="flex-1">
                      <label htmlFor="calendar-year" className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        id="calendar-year"
                        value={tempYear}
                        onChange={(e) => setTempYear(parseInt(e.target.value))}
                        className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      <label htmlFor="calendar-month" className="block text-sm font-medium text-gray-700 mb-2">
                        Month
                      </label>
                      <select
                        id="calendar-month"
                        value={tempMonth}
                        onChange={(e) => setTempMonth(parseInt(e.target.value))}
                        className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                      type="button"
                      onClick={handleMonthYearSelect}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                    >
                      Go
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMonthYearPicker(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={goToNextMonth}
              className="flex h-10 w-10 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-3 sm:p-4">
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
          <div className="mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">Date</span>
              Activities for {formatDateKeyForDisplay(selectedDate)}:
            </h4>
            <div className="space-y-2">
              {selectedDateActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-600 rounded group">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
                    {getActivityIcon(activity.activity || activity.activity_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white break-words">
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
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic break-words">
                        "{activity.notes}"
                      </div>
                    )}
                  </div>
                  
                  {activity.id && onActivityEdit && onActivityDelete && (
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleActivityEdit(activity, e)}
                        aria-label={`Edit ${activity.activity || activity.activity_type || 'activity'} activity for ${activity.plant || activity.plant_name || 'plant'}`}
                        className="flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:text-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                        title="Edit activity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleActivityDelete(activity, e)}
                        aria-label={`Delete ${activity.activity || activity.activity_type || 'activity'} activity for ${activity.plant || activity.plant_name || 'plant'}`}
                        className="flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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
          <div className="mt-4 p-3 sm:p-4 bg-indigo-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex flex-wrap items-center gap-2">
              <span>T</span>
              Tasks for {formatDateKeyForDisplay(selectedDate)}:
            </h4>
            <div className="space-y-2">
              {selectedDateTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-600 rounded">
                  <span className="text-sm text-indigo-700">{getTaskIcon(task.task_type || task.taskType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white break-words">
                      {task.title || task.task}
                    </div>
                    {task.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 break-words">
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
