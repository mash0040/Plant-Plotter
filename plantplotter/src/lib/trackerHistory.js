import { getTodayDateKey } from './trackerData';
import { formatHistoryTime, getTimeSeconds } from './trackerTime';

export const buildCalendarHistory = (calendarData = {}, completedTasks = []) => {
  const calendarHistory = Object.fromEntries(Object.entries(calendarData).map(([date, activities]) => [
    date,
    activities.map((activity, index) => ({
      ...activity,
      sortTime: getTimeSeconds(activity.activity_time === undefined ? activity.time : activity.activity_time),
      time: formatHistoryTime(getTimeSeconds(activity.activity_time === undefined ? activity.time : activity.activity_time)),
      source: 'activity',
      activityRecord: activity,
      historyKey: `activity-${activity.id ?? index}`
    }))
  ]));
  const undatedTasks = [];
  const uniqueTasks = new Map(completedTasks.map(task => [String(task.id), task]));

  uniqueTasks.forEach(task => {
    if (task.status !== 'completed') return;
    const completedAt = task.completed_at ? new Date(task.completed_at) : null;
    const entry = {
      source: 'task',
      historyKey: `task-${task.id}`,
      task,
      title: task.title || 'Completed task',
      activity: 'completed',
      plant: task.plant_name || task.plant || 'Whole garden',
      notes: task.notes || ''
    };

    // Older records may not have a completion timestamp. Never substitute their due date.
    if (!completedAt || Number.isNaN(completedAt.getTime())) {
      undatedTasks.push(entry);
      return;
    }

    const date = getTodayDateKey(completedAt);
    entry.sortTime = completedAt.getHours() * 3600 + completedAt.getMinutes() * 60 + completedAt.getSeconds();
    entry.time = formatHistoryTime(entry.sortTime);
    entry.activity_date = date;
    calendarHistory[date] = [...(calendarHistory[date] || []), entry];
  });

  Object.values(calendarHistory).forEach(entries => entries.sort((first, second) => {
    const firstTime = first.sortTime ?? -1;
    const secondTime = second.sortTime ?? -1;
    return secondTime - firstTime
      || first.historyKey.localeCompare(second.historyKey);
  }));

  return { calendarHistory, undatedTasks };
};
