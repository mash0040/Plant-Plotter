import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import LoadGardenModel from './LoadGardenModel';

vi.mock('@/lib/api', () => ({ default: { getGardens: vi.fn(), getGarden: vi.fn(), deleteGarden: vi.fn() } }));

it('loads showcase gardens while only offering deletion for temporary gardens', async () => {
  const user = userEvent.setup();
  const showcase = { id: 1, name: 'Showcase', isDeletionProtected: true, width: 4, height: 4, plantedItems: [] };
  apiClient.getGardens.mockResolvedValue([showcase, { ...showcase, id: 2, name: 'Experiment', isDeletionProtected: false }]);
  apiClient.getGarden.mockResolvedValue(showcase);
  const onLoad = vi.fn();
  render(<LoadGardenModel isOpen onClose={vi.fn()} onLoad={onLoad} />);
  await screen.findByText('Showcase');
  expect(screen.queryByRole('button', { name: 'Delete Showcase' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete Experiment' })).toBeInTheDocument();
  expect(screen.getByText(/Showcase records stay available/)).toBeInTheDocument();
  await user.click(screen.getByText('Showcase'));
  expect(apiClient.getGarden).toHaveBeenCalledExactlyOnceWith(1);
  expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
});
