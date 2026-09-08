import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GardenList from './GardenList';

describe('GardenList garden creation copy', () => {
  it('uses the standard empty-state heading and creation action', async () => {
    const user = userEvent.setup();
    const handleAddNew = vi.fn();

    render(<GardenList gardens={[]} onAddNew={handleAddNew} />);

    expect(screen.getByRole('heading', { name: 'No gardens yet' })).toBeInTheDocument();

    const createGardenButton = screen.getByRole('button', { name: 'Create Garden' });
    await user.click(createGardenButton);

    expect(handleAddNew).toHaveBeenCalledOnce();
  });

  it('uses the same creation action when gardens already exist', () => {
    render(
      <GardenList
        gardens={[
          {
            id: 1,
            name: 'Kitchen Garden',
            width: 4,
            height: 3,
            soilType: 'Loamy',
            status: 'Active'
          }
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Create Garden' })).toBeInTheDocument();
  });
});
