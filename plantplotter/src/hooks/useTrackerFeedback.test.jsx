import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useTrackerFeedback, {
  getTrackerFailureMessage,
  TRACKER_SUCCESS_DURATION_MS
} from './useTrackerFeedback';

afterEach(() => {
  vi.useRealTimers();
});

describe('useTrackerFeedback', () => {
  it('keeps action context when an API error supplies generic detail', () => {
    expect(getTrackerFailureMessage(
      new Error('Cannot connect to the server. Please try again.'),
      'The task could not be saved.'
    )).toBe('The task could not be saved. Cannot connect to the server. Please try again.');
  });

  it('keeps only the current routine feedback message', () => {
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showSuccess('task-create', 'Task created.'));
    act(() => result.current.showSuccess('activity-update', 'Activity updated.'));

    expect(result.current.feedback).toEqual({
      type: 'success',
      context: 'activity-update',
      message: 'Activity updated.'
    });
  });

  it('does not replace an unrelated error with a success', () => {
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showError('tasks-load', 'Tasks could not be loaded.'));
    act(() => result.current.showSuccess('activity-create', 'Activity logged.'));

    expect(result.current.feedback).toEqual({
      type: 'error',
      context: 'tasks-load',
      message: 'Tasks could not be loaded.'
    });
  });

  it('does not replace an unrelated fallback warning with a success', () => {
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showWarning('gardens-load', 'Showing saved garden data.'));
    act(() => result.current.showSuccess('activity-create', 'Activity logged.'));

    expect(result.current.feedback).toEqual({
      type: 'warning',
      context: 'gardens-load',
      message: 'Showing saved garden data.'
    });
  });

  it('allows a successful retry to replace an error from the same context', () => {
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showError('task-complete-7', 'The task remains pending.'));
    act(() => result.current.showSuccess('task-complete-7', 'Task completed.'));

    expect(result.current.feedback).toEqual({
      type: 'success',
      context: 'task-complete-7',
      message: 'Task completed.'
    });
  });

  it('clears only the requested feedback context', () => {
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showError('tasks-load', 'Tasks could not be loaded.'));
    act(() => result.current.clearFeedback('activities-load'));
    expect(result.current.feedback).not.toBeNull();

    act(() => result.current.clearFeedback('tasks-load'));
    expect(result.current.feedback).toBeNull();
  });

  it('automatically clears success feedback after six seconds', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showSuccess('task-create', 'Task created.'));
    act(() => vi.advanceTimersByTime(TRACKER_SUCCESS_DURATION_MS - 1));
    expect(result.current.feedback).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.feedback).toBeNull();
  });

  it('keeps errors visible until they are dismissed', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTrackerFeedback());

    act(() => result.current.showError('activities-load', 'Activities could not be loaded.'));
    act(() => vi.advanceTimersByTime(TRACKER_SUCCESS_DURATION_MS));
    expect(result.current.feedback).not.toBeNull();

    act(() => result.current.dismissFeedback());
    expect(result.current.feedback).toBeNull();
  });
});
