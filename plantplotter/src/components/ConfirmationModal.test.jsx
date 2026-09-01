import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationModal from './ConfirmationModal';

function ConfirmationHarness({ onConfirm = vi.fn().mockResolvedValue(undefined) }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Request delete</button>
      <ConfirmationModal
        isOpen={isOpen}
        title="Delete garden?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        onConfirm={onConfirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}

describe('ConfirmationModal accessibility', () => {
  it('is a named alert dialog, focuses Cancel, and restores focus after Escape', async () => {
    const user = userEvent.setup();
    render(<ConfirmationHarness />);

    const opener = screen.getByRole('button', { name: 'Request delete' });
    await user.click(opener);

    const dialog = screen.getByRole('alertdialog', { name: 'Delete garden?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This action cannot be undone.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps dismissal disabled while confirmation is pending', async () => {
    const user = userEvent.setup();
    let resolveConfirmation;
    const onConfirm = vi.fn(() => new Promise(resolve => {
      resolveConfirmation = resolve;
    }));

    render(<ConfirmationHarness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Request delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog', { name: 'Delete garden?' })).toBeInTheDocument();

    resolveConfirmation();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled());
  });
});
