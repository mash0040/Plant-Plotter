import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GardenList from './GardenList';

const garden = {
  id: 1,
  name: 'Kitchen Garden',
  width: 4,
  height: 3,
  soilType: 'Loamy',
  status: 'Active'
};

describe('GardenList page actions', () => {
  it('keeps showcase navigation/editing and only offers deletion for temporary records', async () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const showcase = { ...garden, isDeletionProtected: true };
    const temporary = { ...garden, id: 2, name: 'My Experiment', isDeletionProtected: false };
    render(<GardenList gardens={[showcase, temporary]} onDelete={onDelete} onEdit={onEdit} />);
    expect(screen.queryByRole('button', { name: 'Delete Kitchen Garden' })).not.toBeInTheDocument();
    expect(screen.getByText(/Showcase records stay available/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Plan' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(onEdit).toHaveBeenCalledWith(showcase);
    await user.click(screen.getByRole('button', { name: 'Delete My Experiment' }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(temporary);
  });

  it('uses the standard empty-state heading and creation action', async () => {
    const user = userEvent.setup();
    const handleAddNew = vi.fn();

    render(<GardenList gardens={[]} onAddNew={handleAddNew} />);

    expect(screen.getByRole('heading', { name: 'No gardens yet' })).toBeInTheDocument();

    const createGardenButton = screen.getByRole('button', { name: 'Create Garden' });
    await user.click(createGardenButton);

    expect(handleAddNew).toHaveBeenCalledOnce();
  });

  it('presents the page heading and supports keyboard creation when gardens exist', async () => {
    const user = userEvent.setup();
    const handleAddNew = vi.fn();
    render(
      <GardenList gardens={[garden]} onAddNew={handleAddNew} />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My Gardens' })).toBeInTheDocument();
    expect(screen.getByText('Manage and track your garden spaces')).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Create Garden' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(handleAddNew).toHaveBeenCalledOnce();
  });

  it('retains garden navigation and edit/delete actions beneath the header', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<GardenList gardens={[garden]} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByRole('heading', { level: 2, name: garden.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/gardens/1');
    expect(screen.getByRole('link', { name: 'Plan' })).toHaveAttribute('href', '/garden?id=1');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledWith(garden);
    await user.click(screen.getByRole('button', { name: 'Delete Kitchen Garden' }));
    expect(onDelete).toHaveBeenCalledWith(garden);
  });
});
