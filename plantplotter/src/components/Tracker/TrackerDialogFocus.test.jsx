import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ActivityEditModal from './ActivityEditModal';
import TaskEditModal from './TaskEditModal';

const garden = { id: 4, name: 'Patio', plantedItems: [{ name: 'Basil' }] };
const editors = [
  ['task', TaskEditModal, {
    task: { id: 7, garden_id: 4, title: 'Water Basil', task_type: 'water',
      plant_name: 'Basil', status: 'pending', due_date: '2099-09-10' }
  }, 'Delete Task'],
  ['activity', ActivityEditModal, {
    activity: { id: 12, garden_id: 4, activity_type: 'watered', plant_name: 'Basil',
      activity_date: '2026-09-10', notes: '' }
  }, 'Delete Activity']
];

describe('tracker dialog focus', () => {
  it.each(editors)('keeps %s notes focused across delayed opening and delete cancellation', async (_name, Editor, record, deleteLabel) => {
    const frames = new Map();
    let nextFrameId = 0;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++nextFrameId, callback);
      return nextFrameId;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    const flushFrames = () => act(() => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(0));
    });
    const user = userEvent.setup();
    render(<Editor isOpen {...record} gardens={[garden]} selectedGarden={garden}
      onClose={vi.fn()} onSave={vi.fn()} onDelete={vi.fn()} />);

    const notes = screen.getByLabelText('Notes');
    await user.type(notes, 'Before');
    flushFrames();
    expect(notes).toHaveFocus();
    await user.keyboard(' opening');
    expect(notes).toHaveValue('Before opening');

    fireEvent.click(screen.getByRole('button', { name: deleteLabel, exact: true }));
    const deleteConfirmation = screen.getByRole('button', { name: 'Delete', exact: true }).parentElement;
    const cancel = within(deleteConfirmation).getByRole('button', { name: 'Cancel', exact: true });
    expect(cancel).toHaveFocus();
    await user.click(notes);
    flushFrames();
    expect(notes).toHaveFocus();
    await user.keyboard(' confirmation');

    fireEvent.click(cancel);
    expect(screen.getByRole('button', { name: deleteLabel, exact: true })).toHaveFocus();
    await user.click(notes);
    flushFrames();
    expect(notes).toHaveFocus();
    await user.keyboard(' cancelled');
    expect(notes).toHaveValue('Before opening confirmation cancelled');
  });
});
