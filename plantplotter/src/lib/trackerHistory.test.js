import { describe, expect, it } from 'vitest';
import { buildTaskCollections, getTodayDateKey } from './trackerData';
import { buildCalendarHistory } from './trackerHistory';

describe('completed task history', () => {
  it('uses the local completion date and time, not the due date or UTC date', () => {
    const completedAt = new Date(2026, 8, 11, 23, 45);
    const task = { id: 1, title: 'Inspect north bed', plant_name: 'North bed', status: 'completed',
      due_date: '2026-09-09', completed_at: completedAt.toISOString(), notes: 'Leaves healthy\nNo pests' };
    const collections = buildTaskCollections([task]);
    const { calendarHistory, undatedTasks } = buildCalendarHistory({}, collections.completedTasks);

    expect(Object.keys(calendarHistory)).toEqual(['2026-09-11']);
    expect(calendarHistory['2026-09-11'][0]).toMatchObject({ title: task.title, plant: 'North bed', notes: task.notes,
      time: completedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
    expect(collections.calendarTasks).toEqual({});
    expect(undatedTasks).toEqual([]);
  });

  it('combines quick logs and tasks with independent identities and chronological times without mutating inputs', () => {
    const date = getTodayDateKey();
    const completedAt = new Date();
    completedAt.setHours(13, 30, 0, 0);
    const log = Object.freeze({ id: 1, activity: 'watered', plant: 'Basil', time: '09:00' });
    const lateLog = Object.freeze({ id: 2, activity: 'pruned', time: '02:00 PM' });
    const input = Object.freeze({ [date]: Object.freeze([lateLog, log]) });
    const task = Object.freeze({ id: 1, title: 'Check irrigation', status: 'completed', completed_at: completedAt.toISOString() });
    const { calendarHistory } = buildCalendarHistory(input, [task, task]);

    expect(calendarHistory[date].map(entry => entry.historyKey)).toEqual(['activity-2', 'task-1', 'activity-1']);
    expect(calendarHistory[date][2].activityRecord).toBe(log);
    expect(calendarHistory[date][1].task).toBe(task);
    expect(calendarHistory[date][1].plant).toBe('Whole garden');
    expect(input[date]).toEqual([lateLog, log]);
  });

  it('sorts full performed times newest first, places unknown times last, and formats both sources consistently', () => {
    const completedAt = new Date(2026, 8, 11, 13, 29, 10);
    const activities = { '2026-09-11': [
      { id: 1, time: '09:00', activity_time: '09:00:00' },
      { id: 2, time: '13:30', activity_time: '13:30:00' },
      { id: 3, time: '23:59', activity_time: null },
      { id: 4, time: '13:29', activity_time: '13:29:30' },
      { id: 5, time: '00:00', activity_time: '00:00:00' }
    ] };
    const { calendarHistory } = buildCalendarHistory(activities, [{ id: 6, status: 'completed', completed_at: completedAt.toISOString() }]);
    expect(calendarHistory['2026-09-11'].map(entry => [entry.historyKey, entry.time])).toEqual([
      ['activity-2', '1:30 PM'], ['activity-4', '1:29 PM'], ['task-6', '1:29 PM'],
      ['activity-1', '9:00 AM'], ['activity-5', '12:00 AM'], ['activity-3', '']
    ]);
  });

  it('keeps missing or invalid completion dates separate and excludes reopened or cancelled tasks', () => {
    const tasks = [
      { id: 1, status: 'completed', due_date: '2026-09-01', completed_at: null },
      { id: 2, status: 'completed', completed_at: 'invalid' },
      { id: 3, status: 'pending', completed_at: '2026-09-01T12:00:00Z' },
      { id: 4, status: 'cancelled', completed_at: '2026-09-01T12:00:00Z' }
    ];
    const { calendarHistory, undatedTasks } = buildCalendarHistory({}, tasks);
    expect(calendarHistory).toEqual({});
    expect(undatedTasks.map(entry => entry.task.id)).toEqual([1, 2]);
  });
});
