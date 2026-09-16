import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { ApiError, SERVER_ERROR_MESSAGE } from '@/lib/apiErrors';
import GardenPlannerPage from './page';

const { router } = vi.hoisted(() => ({ router: { push: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('id=4'),
  useRouter: () => router
}));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('@/components/Garden/PlantLibrary', () => ({ default: () => null }));
vi.mock('@/components/Garden/GardenCanvas', () => ({
  default: ({ placedPlants, onPlantRemove }) => (
    <div>{placedPlants.map(plant => (
      <button key={plant.id} onClick={() => onPlantRemove(plant.id)}>Remove {plant.name}</button>
    ))}</div>
  )
}));
vi.mock('@/lib/api', () => ({ default: {
  getGarden: vi.fn(), savePlanner: vi.fn(), updateGarden: vi.fn(), saveGardenPlantedItems: vi.fn()
} }));

const garden = { id: 4, name: 'Herbs', description: 'Kitchen herbs', width: 10, height: 8,
  soil_type: 'Loamy', location: 'Backyard', status: 'Planning', plantedItems: [
    { id: 81, plantId: 'basil', name: 'Basil', emoji: 'B', size: 1, category: 'herbs',
      xPosition: 2, yPosition: 3, plantedDate: '2026-09-12', notes: 'Sunny corner' },
    { id: 82, plantId: 'mint', name: 'Mint', size: 1, category: 'herbs', xPosition: 5, yPosition: 1 }
  ] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  apiClient.getGarden.mockResolvedValue(structuredClone(garden));
  apiClient.savePlanner.mockResolvedValue({ ...garden, width: 11 });
});
afterEach(() => vi.unstubAllGlobals());

const editPlanner = async user => {
  render(<GardenPlannerPage />);
  await screen.findByRole('button', { name: 'Remove Mint' });
  await user.click(screen.getByRole('button', { name: 'Increase garden width' }));
  await user.click(screen.getByRole('button', { name: 'Remove Mint' }));
};

it('saves changed dimensions and plants together and only reports success after completion', async () => {
  const user = userEvent.setup();
  let resolveSave;
  apiClient.savePlanner.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
  await editPlanner(user);
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  expect(screen.queryByText('Layout saved.')).not.toBeInTheDocument();
  expect(apiClient.savePlanner).toHaveBeenCalledExactlyOnceWith(4, {
    name: 'Herbs', description: 'Kitchen herbs', width: 11, height: 8,
    soil_type: 'Loamy', location: 'Backyard', status: 'Planning'
  }, [{ plant_id: 'basil', plant_name: 'Basil', plant_emoji: 'B', plant_size: 1,
    plant_category: 'herbs', x_position: 2, y_position: 3, planted_date: '2026-09-12', notes: 'Sunny corner' }]);
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  expect(apiClient.savePlanner).toHaveBeenCalledTimes(1);
  await act(async () => resolveSave({ ...garden, width: 11 }));
  expect(await screen.findByText('Layout saved.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  expect(screen.getByText('No changes to save.')).toBeInTheDocument();
  expect(apiClient.savePlanner).toHaveBeenCalledTimes(1);
  expect(apiClient.updateGarden).not.toHaveBeenCalled();
  expect(apiClient.saveGardenPlantedItems).not.toHaveBeenCalled();
});

it('saves an explicitly empty layout together with new dimensions', async () => {
  const user = userEvent.setup();
  await editPlanner(user);
  await user.click(screen.getByRole('button', { name: 'Remove Basil' }));
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  expect(apiClient.savePlanner).toHaveBeenCalledExactlyOnceWith(4,
    expect.objectContaining({ width: 11, height: 8 }), []);
  expect(await screen.findByText('Layout saved.')).toBeInTheDocument();
});

it('keeps failed edits and failure feedback for an explicit retry', async () => {
  const user = userEvent.setup();
  apiClient.savePlanner.mockRejectedValueOnce(new ApiError(SERVER_ERROR_MESSAGE, { status: 500 }));
  await editPlanner(user);
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(`Your layout could not be saved. ${SERVER_ERROR_MESSAGE}`);
  expect(screen.getByText('Unsaved')).toBeInTheDocument();
  expect(screen.getByLabelText('Garden width')).toHaveValue(11);
  expect(screen.getByRole('button', { name: 'Remove Basil' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Remove Mint' })).not.toBeInTheDocument();
  expect(screen.queryByText('Layout saved.')).not.toBeInTheDocument();
  expect(apiClient.savePlanner).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Save garden' }));
  await waitFor(() => expect(screen.getByText('Layout saved.')).toBeInTheDocument());
  expect(apiClient.savePlanner).toHaveBeenCalledTimes(2);
  expect(apiClient.savePlanner.mock.calls[1]).toEqual(apiClient.savePlanner.mock.calls[0]);
  expect(apiClient.updateGarden).not.toHaveBeenCalled();
  expect(apiClient.saveGardenPlantedItems).not.toHaveBeenCalled();
});
