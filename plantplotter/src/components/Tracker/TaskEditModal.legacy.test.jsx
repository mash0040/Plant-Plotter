import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getTaskUpdatePayload, normalizeTask } from '@/lib/trackerData';
import TaskEditModal from './TaskEditModal';

const garden = { id: 1, name: 'Vegetables', plantCount: 1, plantedItems: [{ name: 'Tomato' }] };
const soilTask = { id: 16, garden_id: 1, title: 'Soil amendment', description: 'Add compost to vegetable beds',
  plant_name: 'All Vegetables', task_type: 'maintenance', status: 'pending', due_date: '2025-08-01',
  priority: 'low', estimated_duration: 120, is_recurring: true, recurring_pattern: 'monthly' };

const setup = (task = soilTask, overrides = {}) => {
  const props = { isOpen: true, task: task ? normalizeTask(task) : null, gardens: [garden], selectedGarden: garden,
    onSave: vi.fn().mockResolvedValue(undefined), onClose: vi.fn(), onDelete: vi.fn(), ...overrides };
  return { ...render(<TaskEditModal {...props} />), props, user: userEvent.setup() };
};
const save = async user => { await user.click(screen.getByRole('button', { name: 'Update Task' })); };

describe('legacy task editing', () => {
  it.each([
    ['Soil amendment', 'All Vegetables', 'monthly'],
    ['Deadhead flowers', 'Flowers', 'weekly'],
    ['Rose care', 'Rose Bush', 'monthly'],
    ['Berry bush maintenance', 'Berries', null]
  ])('opens and saves seeded Maintenance task %s without replacing its title or area', async (title, plant, pattern) => {
    const task = { ...soilTask, title, plant_name: plant, recurring_pattern: pattern, is_recurring: Boolean(pattern) };
    const { props, user } = setup(task);
    expect(screen.getByLabelText('Task Type *')).toHaveValue('maintenance');
    expect(screen.getByRole('option', { name: 'Maintenance' }).selected).toBe(true);
    expect(screen.getByText(title, { exact: true })).toBeVisible();
    expect(screen.getByLabelText('Plant or Area')).toHaveValue(plant);
    expect(screen.getByLabelText('Plant or Area')).toHaveAccessibleDescription(
      "You can keep this task's saved plant or area, or choose a replacement."
    );
    await user.type(screen.getByLabelText('Notes'), 'Keep the soil moist');
    await save(user);
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(getTaskUpdatePayload(props.onSave.mock.calls[0][0])).toMatchObject({
      title, task_type: 'maintenance', plant_name: plant, recurring_pattern: pattern, notes: 'Keep the soil moist'
    });
  });

  it.each(['description', 'due_date', 'priority', 'estimated_duration', 'recurring_pattern'])(
    'preserves a meaningful title when editing %s', async field => {
      const { props, user } = setup();
      const selectors = { description: 'Description', due_date: 'Due Date *', priority: 'Priority',
        estimated_duration: 'Estimated Duration (minutes)', recurring_pattern: 'Recurring Pattern' };
      const values = { description: 'Use mature compost', due_date: '2025-08-02', priority: 'high',
        estimated_duration: '30', recurring_pattern: 'weekly' };
      fireEvent.change(screen.getByLabelText(selectors[field]), { target: { value: values[field] } });
      await save(user);
      expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Soil amendment' }));
    }
  );

  it('preserves a saved planting label when the plant library is unavailable', async () => {
    const task = { ...soilTask, title: 'Fall planting prep', plant_name: 'Fall Vegetables', task_type: 'plant' };
    const { props, user } = setup(task, { isPlantLibraryLoading: true, plantLibraryError: 'Plant options could not be loaded.' });
    expect(screen.getByLabelText('Plant to Add *')).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title: task.title, plant_name: 'Fall Vegetables' }));
  });

  it('updates the preview and saved title only after an explicit type or plant change', async () => {
    const { props, user } = setup();
    await user.selectOptions(screen.getByLabelText('Plant or Area'), 'Tomato');
    expect(screen.getByText('Maintain Tomato', { exact: true })).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Task Type *'), 'water');
    expect(screen.getByText('Water whole garden', { exact: true })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'All Vegetables (saved task value)' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Plant or Area'), 'Tomato');
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Water Tomato', plant_name: 'Tomato', task_type: 'water' }));
  });

  it('can return to the original historical label without changing the original title', async () => {
    const { props, user } = setup();
    await user.selectOptions(screen.getByLabelText('Plant or Area'), 'Tomato');
    await user.selectOptions(screen.getByLabelText('Plant or Area'), 'All Vegetables');
    await user.selectOptions(screen.getByLabelText('Task Type *'), 'maintenance');
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Soil amendment', plant_name: 'All Vegetables' }));
  });

  it('preserves Other titles on ordinary edits and regenerates them for description changes', async () => {
    const { props, user } = setup({ ...soilTask, task_type: 'other', title: 'Prepare supports' });
    await save(user);
    expect(props.onSave).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Prepare supports' }));
    await user.clear(screen.getByLabelText('Description *'));
    await user.type(screen.getByLabelText('Description *'), 'Check the stakes');
    expect(screen.getByText('Other: Check the stakes', { exact: true })).toBeVisible();
    await save(user);
    expect(props.onSave).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Other: Check the stakes' }));
  });

  it('allows an unchanged legacy Other task without a description', async () => {
    const { props, user } = setup({ ...soilTask, task_type: 'other', description: '' });
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.queryByText('Required for Other tasks.')).not.toBeInTheDocument();
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Soil amendment', description: '' }));
  });

  it.each(['legacy-type', ''])('shows and rejects unsupported stored type %j until replaced', async task_type => {
    const { props, user } = setup({ ...soilTask, task_type });
    const field = screen.getByLabelText('Task Type *');
    expect(field).toHaveValue(task_type);
    expect(field.selectedOptions[0].textContent).toMatch(/Unsupported task type/);
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await save(user);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a supported task type before saving.');
    await user.selectOptions(field, 'maintenance');
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ task_type: 'maintenance', title: 'Maintain whole garden' }));
  });

  it('keeps every-2-days recurrence and its historical plant label through submission', async () => {
    const { props, user } = setup({ ...soilTask, title: 'Water pepper plants', task_type: 'water',
      plant_name: 'Bell Pepper', recurring_pattern: 'every-2-days' });
    expect(screen.getByLabelText('Recurring Pattern')).toHaveValue('every-2-days');
    await save(user);
    expect(getTaskUpdatePayload(props.onSave.mock.calls[0][0])).toMatchObject({
      title: 'Water pepper plants', plant_name: 'Bell Pepper', recurring_pattern: 'every-2-days', is_recurring: true
    });
  });

  it.each(['weekly', 'none'])('requires explicit replacement of an unknown recurrence with %s', async replacement => {
    const { props, user } = setup({ ...soilTask, recurring_pattern: 'seasonally' });
    const field = screen.getByLabelText('Recurring Pattern');
    expect(field).toHaveValue('seasonally');
    expect(field.selectedOptions[0].textContent).toBe('Unsupported schedule: seasonally');
    await save(user);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a supported recurrence pattern, or select None.');
    await user.selectOptions(field, replacement);
    await save(user);
    expect(getTaskUpdatePayload(props.onSave.mock.calls[0][0])).toMatchObject({
      title: 'Soil amendment', recurring_pattern: replacement === 'none' ? null : replacement,
      is_recurring: replacement !== 'none'
    });
  });

  it('does not carry a historical option or title into another task or the create form', async () => {
    const { props, rerender } = setup();
    rerender(<TaskEditModal {...props} task={normalizeTask({ ...soilTask, id: 17, title: 'Rose care', plant_name: 'Rose Bush' })} />);
    expect(screen.getByText('Rose care', { exact: true })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'All Vegetables (saved task value)' })).not.toBeInTheDocument();
    rerender(<TaskEditModal {...props} task={null} />);
    expect(screen.queryByText('Rose care', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Rose Bush (saved task value)' })).not.toBeInTheDocument();
  });

  it('rejects a generated title longer than storage permits before calling the API', async () => {
    const plant = 'A'.repeat(255);
    const { props, user } = setup(null, { gardens: [{ ...garden, plantedItems: [{ name: plant }] }] });
    await user.selectOptions(screen.getByLabelText('Plant or Area'), plant);
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('255 characters or fewer');
  });

  it('preserves an existing Unicode title at the database character limit', async () => {
    const title = '🌱'.repeat(255);
    const { props, user } = setup({ ...soilTask, title });
    await save(user);
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ title }));
  });

  it('rejects unsupported types and arbitrary plant labels on new tasks', async () => {
    const { props, user } = setup(null);
    const type = screen.getByLabelText('Task Type *');
    // Simulate a tampered select to verify application validation, not just option rendering.
    type.add(new Option('Unsupported', 'legacy-type'));
    fireEvent.change(type, { target: { value: 'legacy-type' } });
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a supported task type');
    await user.selectOptions(type, 'water');
    const plant = screen.getByLabelText('Plant or Area');
    plant.add(new Option('Not a saved label', 'arbitrary'));
    fireEvent.change(plant, { target: { value: 'arbitrary' } });
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select a plant from this garden');
  });
});
