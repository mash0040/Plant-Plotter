import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import useAccessibleDialog from './useAccessibleDialog';

function DialogHarness({ canDismiss = true, initialFocusRef, withNotes = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const { dialogProps, titleId } = useAccessibleDialog({
    isOpen,
    onClose: () => setIsOpen(false),
    canDismiss,
    initialFocusRef
  });

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open dialog</button>
      {isOpen && (
        <div {...dialogProps}>
          <h2 id={titleId}>Test dialog</h2>
          <button type="button" ref={initialFocusRef}>First action</button>
          {withNotes && <textarea aria-label="Notes" />}
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
}

describe('useAccessibleDialog', () => {
  it.each([false, true])('preserves typing before the opening frame (explicit initial focus: %s)', async explicitFocus => {
    let openingFrame;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      openingFrame = callback;
      return 1;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DialogHarness withNotes initialFocusRef={explicitFocus ? { current: null } : undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    await user.type(notes, 'Before');

    act(() => openingFrame(0));

    expect(notes).toHaveFocus();
    await user.keyboard(' after');
    expect(notes).toHaveValue('Before after');
  });

  it('uses the requested initial focus when focus is still outside the dialog', () => {
    let openingFrame;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      openingFrame = callback;
      return 1;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<DialogHarness initialFocusRef={{ current: null }} />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    opener.focus();
    fireEvent.click(opener);

    act(() => openingFrame(0));

    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();
  });

  it('cancels pending opening focus and restores the opener when closed before the frame', () => {
    vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(42);
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

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
