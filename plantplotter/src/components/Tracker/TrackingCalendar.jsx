'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityColor } from './Constants/ActivitiesData';

export default function TrackingCalendar({ selectedDate, onDateSelect, calendarData }) {
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

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleMonthYearSelect = () => {
    const newDate = new Date(tempYear, tempMonth, 1);
    setCurrentDate(newDate);
    setShowMonthYearPicker(false);
  };

  const getActivityColorClass = (activity) => {
    return getActivityColor(activity);
  };

  // Function to truncate long plant names
  const truncatePlantName = (name, maxLength = 8) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  };

  // Function to get activity icon
  const getActivityIcon = (activity) => {
    switch (activity) {
      case 'planted': return '🌱';
      case 'watered': return '💧';
      case 'fertilized': return '🌿';
      case 'harvested': return '🌾';
      default: return '📝';
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
          {/* Day number */}
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-green-600 font-bold' : 'text-gray-900 dark:text-gray-100'}`}>
            {day}
          </div>
          
          {/* Activities */}
          {activities.length > 0 && (
            <div className="space-y-1">
              {activities.slice(0, 2).map((activity, idx) => (
                <div
                  key={idx}
                  className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 ${getActivityColorClass(activity.activity)} truncate`}
                  title={`${activity.activity} ${activity.plant} at ${activity.time}`}
                >
                  <span className="text-xs">{getActivityIcon(activity.activity)}</span>
                  <span className="truncate font-medium">
                    {truncatePlantName(activity.plant, 6)}
                  </span>
                </div>
              ))}
              
              {/* More activities indicator */}
              {activities.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-center">
                  +{activities.length - 2} more
                </div>
              )}
            </div>
          )}
          
          {/* Activity count dot for days with many activities */}
          {activities.length > 3 && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateActivities = calendarData[selectedDate] || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Garden Tracking Calendar
          </h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
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
            
            <button 
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month/Year Picker */}
        {showMonthYearPicker && (
          <div className="absolute z-10 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 right-4">
            <div className="flex space-x-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year
                </label>
                <select
                  value={tempYear}
                  onChange={(e) => setTempYear(parseInt(e.target.value))}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Month
                </label>
                <select
                  value={tempMonth}
                  onChange={(e) => setTempMonth(parseInt(e.target.value))}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleMonthYearSelect}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Go
              </button>
              <button
                onClick={() => setShowMonthYearPicker(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        {/* Activity Legend */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span>🌱</span>
            <span className="text-gray-600 dark:text-gray-400">Planted</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span className="text-gray-600 dark:text-gray-400">Watered</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌿</span>
            <span className="text-gray-600 dark:text-gray-400">Fertilized</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌾</span>
            <span className="text-gray-600 dark:text-gray-400">Harvested</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {renderCalendar()}
        </div>
        
        {/* Selected Date Details */}
        {selectedDateActivities.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span>📅</span>
              Activities for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}:
            </h4>
            <div className="space-y-2">
              {selectedDateActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 bg-white dark:bg-gray-600 rounded">
                  <span className="text-lg">{getActivityIcon(activity.activity)}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      <span className="capitalize">{activity.activity}</span> {activity.plant}
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}