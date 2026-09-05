'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, CheckCircle2, Plus, Sprout, X } from 'lucide-react';
import GardenSelector from '@/components/Tracker/GardenSelector';
import QuickActions from '@/components/Tracker/QuickActions';
import TrackingCalendar from '@/components/Tracker/TrackingCalendar';
import WeatherWidget from '@/components/Tracker/WeatherWidget';
import DetailedWeatherModal from '@/components/Tracker/DetailedWeatherModal';
import TasksList from '@/components/Tracker/TasksList';
import ActivityModal from '@/components/Tracker/ActivityModal';
import TaskEditModal from '@/components/Tracker/TaskEditModal';
import ActivityEditModal from '@/components/Tracker/ActivityEditModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import ProtectedRoute from '@/components/ProtectedRoute';
import RequestErrorNotice from '@/components/RequestErrorNotice';
import useTrackerActivities from '@/hooks/useTrackerActivities';
import useTrackerFeedback, { getTrackerFailureMessage } from '@/hooks/useTrackerFeedback';
import useTrackerGardens from '@/hooks/useTrackerGardens';
import useTrackerTasks from '@/hooks/useTrackerTasks';
import { useWeather } from '@/hooks/useWeather'; 
import { getPlantedItemName, getTodayDateKey, isFutureDateKey } from '@/lib/trackerData';

const TRACKER_FEEDBACK_STYLES = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
};

const TRACKER_FEEDBACK_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2
};

function TrackingPageContent() {
  const trackerMessageRef = useRef(null);
  const {
    feedback,
    showError,
    showWarning,
    showSuccess,
    clearFeedback,
    dismissFeedback
  } = useTrackerFeedback();
  const {
    gardens,
    selectedGarden,
    setSelectedGarden,
    isLoadingGardens,
    isLoadingSelectedGardenPlants,
    gardenLoadError,
    loadGardens,
    loadSelectedGardenPlants
  } = useTrackerGardens({ showError, showWarning, clearFeedback });
  const {
    calendarData,
    loadActivities,
    addQuickActivity,
    saveActivity: handleActivitySave,
    deleteActivity: handleActivityDelete
  } = useTrackerActivities({ selectedGarden, showError, showSuccess, clearFeedback });
  const {
    todayTasks,
    upcomingTasks,
    overdueTasks,
    calendarTasks,
    taskPlantLibrary,
    isTaskPlantLibraryLoading,
    taskPlantLibraryError,
    clearTaskPlantLibraryError,
    loadTaskPlantLibrary,
    loadTasks,
    completeTask: handleTaskComplete,
    saveTask: handleTaskSave,
    deleteTask: handleTaskDelete
  } = useTrackerTasks({
    gardens,
    selectedGarden,
    setSelectedGarden,
    showError,
    showSuccess,
    clearFeedback
  });
  const [selectedDate, setSelectedDate] = useState(getTodayDateKey);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity: '',
    plant: '',
    notes: '',
    gardenId: null
  });
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showActivityEditModal, setShowActivityEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [isDeletingActivity, setIsDeletingActivity] = useState(false);
  const [showDetailedWeather, setShowDetailedWeather] = useState(false);
  
  // Share one weather request between the card and detailed modal.
  const weatherState = useWeather();
  const { weatherData } = weatherState;

  useEffect(() => {
    if (!feedback) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    trackerMessageRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  }, [feedback]);

  // Load tasks and activities when garden changes
  useEffect(() => {
    if (selectedGarden?.hasLoadedPlants) {
      loadTasks();
      loadActivities();
    } else if (selectedGarden) {
      loadSelectedGardenPlants();
    }
  }, [loadActivities, loadSelectedGardenPlants, loadTasks, selectedGarden]);

  const selectedGardenPlants = selectedGarden?.plantedItems || [];
  const hasSelectedGardenPlants = selectedGardenPlants.some(plant => getPlantedItemName(plant));
  const isSelectedGardenReady = Boolean(selectedGarden?.hasLoadedPlants) && !isLoadingSelectedGardenPlants;
  const isQuickLogDisabled = isFutureDateKey(selectedDate) || !hasSelectedGardenPlants;
  const quickLogHelperText = isFutureDateKey(selectedDate)
    ? 'Quick Log is for completed care. Select today or a past date, or create a task for future work.'
    : 'Add plants to this garden before logging care activity.';
  const taskHelperText = 'Add plants to this garden before creating care tasks.';

  const handleQuickAction = (action) => {
    if (!selectedGarden) return;
    if (isQuickLogDisabled) return;
    
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

    await addQuickActivity(activityData, selectedDate);
    setShowForm(false);
    setFormData({ activity: '', plant: '', notes: '', gardenId: null });
  };

  const handleActivityEdit = (activity) => {
    setEditingActivity(activity);
    setShowActivityEditModal(true);
  };

  const handleActivityDeleteRequest = (activity) => {
    setActivityToDelete(activity);
  };

  const handleConfirmActivityDelete = async () => {
    if (!activityToDelete || isDeletingActivity) return;

    try {
      setIsDeletingActivity(true);
      await handleActivityDelete(activityToDelete);
      setActivityToDelete(null);
    } catch (error) {
      showError(
        'activity-delete',
        getTrackerFailureMessage(error, 'The activity could not be deleted and remains on the calendar.')
      );
    } finally {
      setIsDeletingActivity(false);
    }
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    clearTaskPlantLibraryError();
    setShowTaskEditModal(true);
    loadTaskPlantLibrary();
  };

  const handleTaskAdd = () => {
    setEditingTask(null);
    clearTaskPlantLibraryError();
    setShowTaskEditModal(true);
    loadTaskPlantLibrary();
  };

  // Filter calendar data by selected garden
  const filteredCalendarData = selectedGarden ? calendarData : {};
  const FeedbackIcon = feedback ? TRACKER_FEEDBACK_ICONS[feedback.type] : null;

  if (isLoadingGardens || isLoadingSelectedGardenPlants) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracker data...</p>
        </div>
      </div>
    );
  }

  if (gardenLoadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white/90 p-4 shadow-xl sm:p-6">
          <RequestErrorNotice
            title="Tracker unavailable"
            message={gardenLoadError}
            onRetry={loadGardens}
          />
          <Link
            href="/gardens"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            Go to My Gardens
          </Link>
        </div>
      </div>
    );
  }

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
          <Link
            href="/gardens"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            <Sprout className="w-5 h-5" />
            Create Your First Garden
          </Link>
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 dark:bg-gray-900">
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        {feedback && (
          <div
            ref={trackerMessageRef}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
            className={`mb-4 flex items-start gap-3 rounded-lg border p-3 text-sm font-medium shadow-sm ${TRACKER_FEEDBACK_STYLES[feedback.type]}`}
          >
            <FeedbackIcon className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 leading-5">{feedback.message}</p>
            <button
              type="button"
              onClick={dismissFeedback}
              aria-label="Dismiss tracker message"
              className="touch-target -m-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 space-y-4 sm:space-y-6">
            <GardenSelector 
              gardens={gardens}
              selectedGarden={selectedGarden}
              onGardenSelect={setSelectedGarden}
            />
            <QuickActions 
              onQuickAction={handleQuickAction}
              selectedGarden={selectedGarden}
              disabled={isQuickLogDisabled}
              helperText={quickLogHelperText}
              managePlantsHref={!hasSelectedGardenPlants ? `/garden?id=${selectedGarden.id}` : ''}
            />
          </div>

          {/* Main Calendar */}
          <div className="w-full lg:flex-1 min-w-0">
            <TrackingCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              calendarData={filteredCalendarData}
              taskData={calendarTasks}
              onActivityEdit={handleActivityEdit}
              onActivityDelete={handleActivityDeleteRequest}
            />
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 space-y-4 sm:space-y-6">
            <div className="rounded-lg bg-white p-4 text-gray-900 shadow-lg dark:bg-gray-800 dark:text-white">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Care Tasks</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {overdueTasks.length > 0
                      ? `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task needs' : 'tasks need'} attention`
                      : 'Your immediate garden work'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTaskAdd}
                  disabled={!hasSelectedGardenPlants}
                  className="touch-target inline-flex min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create Task
                </button>
              </div>
              {isSelectedGardenReady && !hasSelectedGardenPlants && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <p>{taskHelperText}</p>
                  <Link
                    href={`/garden?id=${selectedGarden.id}`}
                    className="mt-2 inline-flex font-medium text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                  >
                    Manage Plants
                  </Link>
                </div>
              )}

              <div>
                <TasksList
                  title="Overdue"
                  tasks={overdueTasks}
                  onTaskComplete={handleTaskComplete}
                  onTaskEdit={handleTaskEdit}
                  emptyMessage="No overdue tasks"
                  tone="urgent"
                />
                <TasksList
                  title="Today"
                  tasks={todayTasks}
                  onTaskComplete={handleTaskComplete}
                  onTaskEdit={handleTaskEdit}
                  emptyMessage="Nothing due today"
                />
                <TasksList
                  title="Upcoming"
                  tasks={upcomingTasks}
                  onTaskComplete={handleTaskComplete}
                  onTaskEdit={handleTaskEdit}
                  showCheckboxes
                  emptyMessage="No upcoming tasks"
                  collapsible
                />
              </div>
            </div>

            <WeatherWidget
              weatherState={weatherState}
              onViewDetails={weatherData ? () => setShowDetailedWeather(true) : undefined}
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
        selectedGarden={selectedGarden}
        plantLibrary={taskPlantLibrary}
        isPlantLibraryLoading={isTaskPlantLibraryLoading}
        plantLibraryError={taskPlantLibraryError}
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
        selectedDate={selectedDate}
      />

      <ConfirmationModal
        isOpen={Boolean(activityToDelete)}
        title="Delete activity?"
        message={`This will remove the ${activityToDelete?.activity || activityToDelete?.activity_type || 'activity'} log for ${activityToDelete?.plant || activityToDelete?.plant_name || 'this plant'}. This cannot be undone.`}
        confirmLabel="Delete Activity"
        confirmingLabel="Deleting..."
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmActivityDelete}
        onCancel={() => setActivityToDelete(null)}
      />

      {/* Detailed Weather Modal */}
      <DetailedWeatherModal
        isOpen={showDetailedWeather}
        onClose={() => setShowDetailedWeather(false)}
        weatherData={weatherData}
        weatherError={weatherState.error}
        isWeatherLoading={weatherState.loading}
        onRetry={weatherState.refreshWeather}
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
