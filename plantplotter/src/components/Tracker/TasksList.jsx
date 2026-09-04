'use client';
import React from 'react';
import { AlertCircle, Check, CheckCircle, ChevronDown, Clock, Edit3 } from 'lucide-react';
import { formatTaskDate, getPriorityColor } from './Constants/TaskData';

export default function TasksList({
  title,
  tasks,
  onTaskComplete,
  onTaskEdit,
  showCheckboxes = false,
  emptyMessage = 'No tasks',
  showEditButtons = true,
  collapsible = false,
  tone = 'default'
}) {
  const isUrgent = tone === 'urgent' && tasks.length > 0;
  const taskCountLabel = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;

  const renderTaskItems = () => {
    if (tasks.length === 0) {
      const EmptyIcon = title === 'Today' ? CheckCircle : Clock;
      return (
        <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2.5 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-300">
          <EmptyIcon className={`h-4 w-4 flex-shrink-0 ${title === 'Today' ? 'text-green-600' : 'text-gray-400'}`} />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {tasks.map(task => {
          const taskName = task.title || task.task || 'task';

          return (
            <div key={task.id} className="group flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700">
              {showCheckboxes ? (
                <label className="touch-target flex flex-shrink-0 items-start justify-center pt-0.5">
                  <input
                    type="checkbox"
                    aria-label={`Complete ${taskName}`}
                    className="h-6 w-6 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    onChange={() => onTaskComplete && onTaskComplete(task.id)}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => onTaskComplete && onTaskComplete(task.id)}
                  className="touch-target group mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-gray-300 transition-colors hover:border-green-500 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:border-gray-500 dark:hover:border-green-500 dark:hover:bg-green-900"
                  title="Complete task"
                  aria-label={`Complete ${taskName}`}
                >
                  <Check className="h-3 w-3 text-green-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium text-gray-900 dark:text-white">
                      {task.title || task.task}
                    </div>
                    {(task.plant || task.description) && (
                      <div className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">
                        {[task.plant, task.description].filter(Boolean).join(' - ')}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {task.priority && (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}

                      {task.estimatedDuration && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="mr-1 h-3 w-3" />
                          {task.estimatedDuration}m
                        </div>
                      )}

                      {task.dueDate && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {task.date || formatTaskDate(task.dueDate)}
                        </div>
                      )}
                    </div>

                    {task.isRecurring && (
                      <div className="mt-1 break-words text-xs text-blue-600 dark:text-blue-400">
                        Recurring ({task.recurringPattern?.replace('-', ' ')})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {showEditButtons && onTaskEdit && (
                      <button
                        type="button"
                        onClick={() => onTaskEdit(task)}
                        className="touch-target touch-reveal flex h-9 w-9 items-center justify-center rounded bg-gray-100 opacity-100 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        title="Edit task"
                        aria-label={`Edit ${taskName}`}
                      >
                        <Edit3 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    )}
                    {task.urgent && (
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" aria-label="Urgent task" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (collapsible && tasks.length > 0) {
    return (
      <details className="group pt-3">
        <summary className="touch-target flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300" aria-label={taskCountLabel}>
              {tasks.length}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pt-1">{renderTaskItems()}</div>
      </details>
    );
  }

  return (
    <section
      aria-label={`${title} tasks`}
      className="border-b border-gray-100 py-4 first:pt-0 last:border-b-0 last:pb-0 dark:border-gray-700"
    >
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h4 className={`font-semibold ${isUrgent ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>
          {title}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isUrgent
              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}
          aria-label={taskCountLabel}
        >
          {tasks.length}
        </span>
      </div>
      {renderTaskItems()}
    </section>
  );
}
