import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TaskEditModal from './TaskEditModal';

const garden = {
  id: 4,
  name: 'Patio Garden',
  location: 'Patio',
  plantCount: 1,
  plantedItems: [{ name: 'Pepper' }]
};

describe('TaskEditModal recurrence', () => {
  it('represents and preserves the legacy every-2-days pattern while editing', () => {
    render(
      <TaskEditModal
        isOpen
        onClose={vi.fn()}
        task={{
          id: 7,
          title: 'Water pepper plants',
          garden_id: 4,
          due_date: '2026-09-10',
          priority: 'medium',
          plant_name: 'Pepper',
          task_type: 'water',
          status: 'pending',
          is_recurring: true,
          recurring_pattern: 'every-2-days'
        }}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        gardens={[garden]}
        selectedGarden={garden}
      />
    );

    expect(screen.getByRole('option', { name: 'Every 2 days' })).toBeInTheDocument();
    expect(screen.getByLabelText('Recurring Pattern')).toHaveValue('every-2-days');
  });
});
