import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import useAccessibleDialog from './useAccessibleDialog';

function DialogHarness({ canDismiss = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose: () => setIsOpen(false),
    canDismiss
  });

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      {isOpen && (
        <div {...dialogProps}>
          <h2 id={titleId}>Test dialog</h2>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
}

describe('useAccessibleDialog', () => {
  it('moves focus into a named modal dialog and traps forward and reverse tabbing', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = screen.getByRole('dialog', { name: 'Test dialog' });
    const firstAction = screen.getByRole('button', { name: 'First action' });
    const lastAction = screen.getByRole('button', { name: 'Last action' });

    await waitFor(() => expect(dialog).toHaveFocus());
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.tab();
    expect(lastAction).toHaveFocus();

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastAction).toHaveFocus();
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('does not close on Escape while dismissal is disabled', async () => {
    const user = userEvent.setup();
    render(<DialogHarness canDismiss={false} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'Test dialog' })).toBeInTheDocument();
  });
});
