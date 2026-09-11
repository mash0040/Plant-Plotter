import { render, screen } from '@testing-library/react';
import GardenSelector from './GardenSelector';

describe('GardenSelector garden creation copy', () => {
  it('uses the standard empty-state heading and creation action', () => {
    render(
      <GardenSelector
        gardens={[]}
        selectedGarden={null}
        onGardenSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'No gardens yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Garden' })).toHaveAttribute(
      'href',
      '/gardens?create=true&returnTo=/tracker'
    );
  });
});
