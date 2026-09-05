import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import useTrackerGardens from './useTrackerGardens';

vi.mock('@/lib/api', () => ({
  default: {
    getGardenSummaries: vi.fn(),
    getGardenPlants: vi.fn()
  }
}));

const createFeedback = () => ({
  showError: vi.fn(),
  showWarning: vi.fn(),
  clearFeedback: vi.fn()
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useTrackerGardens', () => {
  it('loads garden summaries and hydrates the selected garden plants', async () => {
    apiClient.getGardenSummaries.mockResolvedValue([
      { id: 3, name: 'Vegetable Beds', plant_count: 1, status: 'Active', location: 'Backyard' }
    ]);
    apiClient.getGardenPlants.mockResolvedValue([
      { id: 8, name: 'Tomato', category: 'vegetables' }
    ]);
    const feedback = createFeedback();
    const { result } = renderHook(() => useTrackerGardens(feedback));

    await waitFor(() => expect(result.current.isLoadingGardens).toBe(false));
    expect(result.current.selectedGarden).toMatchObject({
      id: 3,
      plantCount: 1,
      hasLoadedPlants: false
    });

    await act(async () => result.current.loadSelectedGardenPlants());

    expect(apiClient.getGardenPlants).toHaveBeenCalledWith(3);
    expect(result.current.selectedGarden).toMatchObject({
      plantCount: 1,
      plantedItems: [{ id: 8, name: 'Tomato', category: 'vegetables' }],
      hasLoadedPlants: true
    });
    expect(feedback.clearFeedback).toHaveBeenCalledWith('plants-load');
  });

  it('uses saved gardens only for eligible read failures', async () => {
    const networkError = Object.assign(new Error('Cannot connect to the server.'), {
      code: API_ERROR_CODES.NETWORK_ERROR
    });
    apiClient.getGardenSummaries.mockRejectedValue(networkError);
    localStorage.setItem('gardens', JSON.stringify([
      { id: 4, name: 'Patio', plantedItems: [{ name: 'Basil' }] }
    ]));
    const feedback = createFeedback();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTrackerGardens(feedback));

    await waitFor(() => expect(result.current.isLoadingGardens).toBe(false));

    expect(result.current.selectedGarden).toMatchObject({
      id: 4,
      plantCount: 1,
      hasLoadedPlants: true
    });
    expect(feedback.showWarning).toHaveBeenCalledWith(
      'gardens-load',
      'Showing saved garden data. Cannot connect to the server.'
    );
    consoleError.mockRestore();
  });
});
