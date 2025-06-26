'use client';
import React from 'react';
import { Check } from 'lucide-react';

export default function TasksList({ 
  title, 
  tasks, 
  completedTasks, 
  onTaskComplete, 
  showCheckboxes = false 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{title}</h3>
      <div className="space-y-3">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center space-x-3">
            {showCheckboxes ? (
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" 
              />
            ) : (
              <button
                onClick={() => onTaskComplete(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  completedTasks.has(task.id) 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {completedTasks.has(task.id) && <Check className="w-3 h-3 text-white" />}
              </button>
            )}
            <div className={`flex-1 ${
              completedTasks.has(task.id) 
                ? 'line-through text-gray-500' 
                : 'text-gray-900 dark:text-white'
            }`}>
              <div className="font-medium">
                {task.date ? `${task.date}: ` : ''}{task.task}
              </div>
              <div className="text-sm text-gray-500">{task.plant}</div>
              {task.urgent && (
                <div className="text-xs text-red-500 font-medium">Urgent</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}