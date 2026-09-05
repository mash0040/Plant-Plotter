import { describe, expect, it } from 'vitest';
import {
  buildActivityCalendar,
  buildTaskCollections,
  createCalendarActivity,
  getGardenIcon,
  getTaskCreatePayload,
  getTaskUpdatePayload,
  hydrateTrackerGarden,
  normalizeTask,
  normalizeTrackerGarden
} from './trackerData';

describe('tracker garden transformations', () => {
  it('normalizes API summaries without pretending plants are loaded', () => {
    expect(normalizeTrackerGarden({
      id: 4,
      name: 'Kitchen Herbs',
      plant_count: 3,
      status: '',
      location: ''
    })).toEqual({
      id: 4,
      name: 'Kitchen Herbs',
      icon: 'Herb',
      plantCount: 3,
      status: 'Active',
      location: 'Unknown',
      plantedItems: [],
      hasLoadedPlants: false
    });
  });

  it('preserves planted items from the local read fallback', () => {
    const garden = normalizeTrackerGarden({
      id: 5,
      name: 'Back Plot',
      plantedItems: [{ name: 'Tomato', category: 'vegetables' }]
    }, { fromLocalStorage: true });

    expect(garden).toMatchObject({
      icon: 'Veg',
      plantCount: 1,
      hasLoadedPlants: true
    });
    expect(garden.plantedItems).toHaveLength(1);
  });

  it('hydrates a selected garden with its planted items', () => {
    expect(hydrateTrackerGarden(
      { id: 2, name: 'Patio', hasLoadedPlants: false },
      [{ name: 'Basil' }, { name: 'Mint' }]
    )).toMatchObject({ plantCount: 2, hasLoadedPlants: true });
  });

  it('uses planted categories before garden-name icon hints', () => {
    expect(getGardenIcon({
      name: 'Flower Corner',
      plantedItems: [
        { category: 'herbs' },
        { category: 'herbs' },
        { category: 'flowers' }
      ]
    })).toBe('Herb');
  });
});

describe('tracker activity transformations', () => {
  it('groups activities and identifies plants no longer in the garden', () => {
    const calendar = buildActivityCalendar([
      {
        id: 1,
        garden_id: 9,
        activity_type: 'watered',
        plant_name: 'Tomato',
        activity_date: '2026-09-05',
        activity_time: '08:45:00'
      },
      {
        id: 2,
        garden_id: 9,
        activity_type: 'pruned',
        plant_name: 'Rose',
        activity_date: '2026-09-05',
        activity_time: '10:30:00'
      }
    ], [{ plant_name: 'Tomato' }]);

    expect(calendar['2026-09-05']).toEqual([
      expect.objectContaining({ id: 1, time: '08:45', plant_no_longer_planted: false }),
      expect.objectContaining({ id: 2, time: '10:30', plant_no_longer_planted: true })
    ]);
  });

  it('creates the immediate calendar entry used by Quick Log', () => {
    expect(createCalendarActivity({
      savedActivity: { id: 12 },
      activityData: { activity: 'weeded', plant: 'Basil', notes: 'Around the edge' },
      selectedDate: '2026-09-05',
      gardenId: 3,
      now: new Date('2026-09-05T14:30:00')
    })).toMatchObject({
      id: 12,
      activity: 'weeded',
      plant: 'Basil',
      notes: 'Around the edge',
      activity_date: '2026-09-05',
      garden_id: 3
    });
  });
});

describe('tracker task transformations', () => {
  it('normalizes legacy field names and derived statuses', () => {
    expect(normalizeTask({
      id: 7,
      gardenId: 2,
      dueDate: '2026-09-04T00:00:00.000Z',
      plant: 'Pepper',
      taskType: 'water',
      estimatedDuration: 15,
      isRecurring: true,
      recurringPattern: 'weekly',
      status: 'overdue'
    })).toMatchObject({
      garden_id: 2,
      due_date: '2026-09-04',
      plant_name: 'Pepper',
      task_type: 'water',
      estimated_duration: 15,
      is_recurring: true,
      recurring_pattern: 'weekly',
      status: 'pending'
    });
  });

  it('splits pending tasks into deterministic queues and calendar groups', () => {
    const collections = buildTaskCollections([
      { id: 3, title: 'Later', due_date: '2026-09-06', status: 'pending' },
      { id: 2, title: 'Second today', due_date: '2026-09-05', due_time: '10:00', status: 'pending' },
      { id: 1, title: 'First today', due_date: '2026-09-05', due_time: '08:00', status: 'pending' },
      { id: 4, title: 'Earlier', due_date: '2026-09-04', status: 'in_progress' },
      { id: 5, title: 'Done', due_date: '2026-09-05', status: 'completed' }
    ], new Date(2026, 8, 5));

    expect(collections.todayTasks.map(task => task.id)).toEqual([1, 2]);
    expect(collections.upcomingTasks.map(task => task.id)).toEqual([3]);
    expect(collections.overdueTasks.map(task => task.id)).toEqual([4]);
    expect(Object.keys(collections.calendarTasks)).toEqual([
      '2026-09-06',
      '2026-09-05',
      '2026-09-04'
    ]);
    expect(collections.calendarTasks['2026-09-05'].map(task => task.id)).toEqual([1, 2]);
  });

  it('maps task updates without dropping notes or recurring fields', () => {
    expect(getTaskUpdatePayload({
      title: 'Water basil',
      dueDate: '2026-09-06',
      plant: 'Basil',
      taskType: 'water',
      estimatedDuration: 10,
      isRecurring: true,
      recurringPattern: 'weekly',
      notes: 'Use rain barrel',
      status: 'pending'
    }, { status: 'completed' })).toMatchObject({
      due_date: '2026-09-06',
      plant_name: 'Basil',
      task_type: 'water',
      estimated_duration: 10,
      is_recurring: true,
      recurring_pattern: 'weekly',
      notes: 'Use rain barrel',
      status: 'completed'
    });
  });

  it('maps new non-recurring tasks to the current API payload', () => {
    expect(getTaskCreatePayload({
      title: 'Inspect leaves',
      garden_id: 3,
      due_date: '2026-09-07',
      task_type: 'inspect',
      recurring_pattern: 'none'
    })).toEqual({
      title: 'Inspect leaves',
      description: '',
      garden_id: 3,
      due_date: '2026-09-07',
      priority: 'medium',
      status: 'pending',
      plant_name: null,
      task_type: 'inspect',
      estimated_duration: null,
      is_recurring: false,
      recurring_pattern: null,
      notes: ''
    });
  });
});
