import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const savedTask = {
  id: 7, title: 'Water Pepper', garden_id: 4, due_date: '2099-09-10',
  plant_name: 'Pepper', task_type: 'water', status: 'pending'
};
const renderEditor = (task = null, onSave = vi.fn().mockResolvedValue(undefined)) => {
  const props = { isOpen: true, onClose: vi.fn(), task, onSave, onDelete: vi.fn(),
    gardens: [garden], selectedGarden: garden };
  return { ...render(<TaskEditModal {...props} />), props };
};

describe('TaskEditModal notes', () => {
  it('submits notes on creation and displays the fetched text when reopened', async () => {
    const user = userEvent.setup();
    const notes = 'Use rain barrel\nCheck café herbs 🌱';
    const { props, rerender } = renderEditor();
    await user.type(screen.getByLabelText('Notes'), notes);
    fireEvent.submit(screen.getByLabelText('Notes').closest('form'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ notes })));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    rerender(<TaskEditModal {...props} isOpen={false} />);
    rerender(<TaskEditModal {...props} task={{ ...savedTask, notes }} />);
    expect(screen.getByLabelText('Notes')).toHaveValue(notes);
  });

  it.each(['Updated instructions', ''])('persists edited notes including clearing: %j', async notes => {
    const user = userEvent.setup();
    const { props, rerender } = renderEditor({ ...savedTask, notes: 'Original notes' });
    await user.clear(screen.getByLabelText('Notes'));
    if (notes) await user.type(screen.getByLabelText('Notes'), notes);
    fireEvent.submit(screen.getByLabelText('Notes').closest('form'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 7, notes })));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    rerender(<TaskEditModal {...props} task={{ ...savedTask, notes: notes || null }} />);
    expect(screen.getByLabelText('Notes')).toHaveValue(notes);
  });

  it.each([null, undefined])('loads existing tasks with %j notes as an empty field', notes => {
    renderEditor({ ...savedTask, notes });
    expect(screen.getByLabelText('Notes')).toHaveValue('');
  });

  it.each(['x'.repeat(2000), '🌱'.repeat(1000)])('accepts notes at the length limit (%#)', async notes => {
    const { props } = renderEditor(savedTask);
    const field = screen.getByLabelText('Notes');
    expect(field).toHaveAttribute('maxlength', '2000');
    expect(field).toHaveAccessibleDescription('Up to 2,000 characters.');
    fireEvent.change(field, { target: { value: notes } });
    fireEvent.submit(field.closest('form'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ notes })));
  });

  it.each(['x'.repeat(2001), `${'🌱'.repeat(1000)}x`])('rejects overlong notes, preserves the draft and allows correction (%#)', async notes => {
    const { props } = renderEditor(savedTask);
    const field = screen.getByLabelText('Notes');
    // Bypass native maxlength to exercise application validation (e.g. loaded data).
    fireEvent.change(field, { target: { value: notes } });
    fireEvent.submit(field.closest('form'));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(field).toHaveValue(notes);
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Notes must be 2,000 characters or fewer.');
    expect(screen.getByRole('alert')).toHaveTextContent('Notes must be 2,000 characters or fewer.');
    fireEvent.change(field, { target: { value: 'Corrected notes' } });
    expect(field).toHaveAttribute('aria-invalid', 'false');
    fireEvent.submit(field.closest('form'));
    await waitFor(() => expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Corrected notes' })));
  });

  it('retains notes after a failed save and retries only on submission', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined);
    const { props } = renderEditor(savedTask, onSave);
    const field = screen.getByLabelText('Notes');
    fireEvent.change(field, { target: { value: 'Keep this draft' } });
    fireEvent.submit(field.closest('form'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The task could not be saved. Review your changes and try again. Offline'
    );
    expect(field).toHaveValue('Keep this draft');
    expect(props.onClose).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.submit(field.closest('form'));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ notes: 'Keep this draft' }));
  });
});
