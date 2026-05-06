'use client';
import React from 'react';
import { Check, Clock, AlertCircle, CheckCircle, Edit3, Plus } from 'lucide-react';
import { formatTaskDate, getPriorityColor } from './Constants/TaskData';

export default function TasksList({ 
  title, 
  tasks, 
  onTaskComplete, 
  onTaskEdit,
  onTaskAdd,
  showCheckboxes = false,
  emptyMessage = "No tasks",
  showEditButtons = true,
  showAddButton = true
}) {
  // Empty state for today tasks (celebration)
  if (tasks.length === 0 && title === "Today Tasks") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
        <div className="text-center py-6">
          <div className="mb-2">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">
            All Done!
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            Great job! No tasks for today. Enjoy your free time in the garden.
          </p>
        </div>
      </div>
    );
  }

  // Empty state for other task lists
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
        <div className="text-center py-6">
          <div className="mb-2">
            <Clock className="w-8 h-8 text-gray-400 mx-auto" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
          {showAddButton && onTaskAdd && (
            <button 
              onClick={onTaskAdd}
              className="flex h-9 w-9 items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
              title="Add new task"
            >
              <Plus className="w-4 h-4 text-blue-600" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="group flex items-start space-x-3 p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {showCheckboxes ? (
              <input 
                type="checkbox" 
                className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-0.5 flex-shrink-0" 
                onChange={() => onTaskComplete && onTaskComplete(task.id)}
              />
            ) : (
              <button
                onClick={() => onTaskComplete && onTaskComplete(task.id)}
                className="w-6 h-6 rounded border-2 flex items-center justify-center transition-colors border-gray-300 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 mt-0.5 flex-shrink-0 group"
                title="Complete task"
              >
                <Check className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm break-words">
                    {task.title || task.task}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                    {[task.plant, task.description].filter(Boolean).join(' - ')}
                  </div>
                  
                  {/* Task metadata */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {task.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    )}
                    
                    {task.estimatedDuration && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {task.estimatedDuration}m
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className="text-xs text-gray-500">
                        {task.date || formatTaskDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                  
                  {task.isRecurring && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 break-words">
                      Recurring ({task.recurringPattern?.replace('-', ' ')})
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {showEditButtons && onTaskEdit && (
                    <button
                      onClick={() => onTaskEdit(task)}
                      className="flex h-9 w-9 items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  {task.urgent && (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
