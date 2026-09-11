import { DndContext } from '@dnd-kit/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import PlantLibrary from './PlantLibrary';

vi.mock('@/lib/api', () => ({ default: { getPlantLibrary: vi.fn() } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: 'user' } }) }));

const longDescription = 'Grow in rich soil and water regularly. '.repeat(80).trim();
const plants = [
  {
    id: 'tomato', name: 'Tomato', emoji: '🍅', category: 'vegetables',
    description: longDescription, companion_plants: ['basil', 'carrot'],
    avoid_plants: ['fennel'], sunlight: 'Full sun'
  },
  { id: 'basil', name: 'Basil', emoji: '🌿', category: 'herbs' }
];

function LibraryHarness({ searchTerm = '', isOpen = true }) {
  return (
    <DndContext>
      <div data-sidebar>
        <PlantLibrary
          searchTerm={searchTerm}
          setSearchTerm={vi.fn()}
          isOpen={isOpen}
          onToggle={vi.fn()}
          disableDrag
        />
      </div>
    </DndContext>
  );
}

async function openDetails(user, name = 'Tomato') {
  const opener = await screen.findByRole('button', { name: `View information for ${name}` });
  await user.click(opener);
  const dialog = screen.getByRole('dialog', { name });
  await waitFor(() => expect(dialog).toHaveFocus());
  return { opener, dialog };
}

describe('Plant library details', () => {
  beforeEach(() => {
    apiClient.getPlantLibrary.mockResolvedValue(plants);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a mobile drawer locked after details close, then releases on drawer close', async () => {
    const mediaQuery = Object.assign(new EventTarget(), { matches: true });
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
    const user = userEvent.setup();
    const { container, rerender } = render(<LibraryHarness />);
    await screen.findByRole('button', { name: 'View information for Tomato' });
    expect(document.body.style.position).toBe('fixed');

    const { dialog } = await openDetails(user);
    const libraryScroller = container.querySelector('[data-scroll-container="plants"]');
    expect(libraryScroller.closest('[inert]')).not.toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Close plant details' }));
    expect(libraryScroller.closest('[inert]')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');

    rerender(<LibraryHarness isOpen={false} />);
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.body.style.position).not.toBe('fixed');
  });

  it('locks only the mobile drawer and releases when resizing to a desktop sidebar', async () => {
    const mediaQuery = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
    const { unmount } = render(<LibraryHarness />);
    await screen.findByRole('button', { name: 'View information for Tomato' });
    expect(document.body.style.position).not.toBe('fixed');
    act(() => {
      mediaQuery.matches = true;
      mediaQuery.dispatchEvent(new Event('change'));
    });
    expect(document.body.style.position).toBe('fixed');
    act(() => {
      mediaQuery.matches = false;
      mediaQuery.dispatchEvent(new Event('change'));
    });
    expect(document.body.style.position).not.toBe('fixed');
    unmount();
  });

  it('opens named modal details outside the sidebar and locks body scrolling', async () => {
    const user = userEvent.setup();
    const { container } = render(<LibraryHarness />);
    const { dialog } = await openDetails(user);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(container).not.toContainElement(dialog);
    expect(dialog.parentElement.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');
    const details = within(dialog).getByRole('region', { name: 'Plant details' });
    expect(details).toHaveTextContent(longDescription);
    expect(details).toHaveTextContent('Basil, Carrot');
    expect(details).toHaveTextContent('Fennel');
    expect(details).not.toContainElement(within(dialog).getByRole('button', { name: 'Close plant details' }));
    expect(details).not.toContainElement(within(dialog).getByRole('button', { name: 'Close', exact: true }));
  });

  it.each(['Close plant details', 'Close'])('dismisses with %s and restores focus and scrolling', async (name) => {
    const user = userEvent.setup();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    try {
      render(<LibraryHarness />);
      const { opener, dialog } = await openDetails(user);
      await user.click(within(dialog).getByRole('button', { name, exact: true }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
      expect(document.body.style.overflow).toBe('auto');
    } finally {
      document.body.style.overflow = previousOverflow;
    }
  });

  it('traps keyboard focus, allows focusing the scroll region, and dismisses with Escape', async () => {
    const user = userEvent.setup();
    render(<LibraryHarness />);
    const { opener, dialog } = await openDetails(user);
    const headerClose = within(dialog).getByRole('button', { name: 'Close plant details' });
    const footerClose = within(dialog).getByRole('button', { name: 'Close', exact: true });

    await user.tab();
    expect(headerClose).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('region', { name: 'Plant details' })).toHaveFocus();
    await user.tab();
    expect(footerClose).toHaveFocus();
    await user.tab();
    expect(headerClose).toHaveFocus();
    await user.tab({ shift: true });
    expect(footerClose).toHaveFocus();

    const outsideKeyDown = vi.fn();
    document.addEventListener('keydown', outsideKeyDown);
    try {
      await user.keyboard('{Escape}');
      expect(outsideKeyDown.mock.calls.some(([event]) => event.key === 'Escape')).toBe(false);
    } finally {
      document.removeEventListener('keydown', outsideKeyDown);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('does not send modal presses to the planner outside-click handler', async () => {
    const user = userEvent.setup();
    render(<LibraryHarness />);
    const { dialog } = await openDetails(user);
    const outsideMouseDown = vi.fn();
    document.addEventListener('mousedown', outsideMouseDown);
    try {
      await user.click(within(dialog).getByRole('region', { name: 'Plant details' }));
      await user.click(dialog.parentElement);
      expect(outsideMouseDown).not.toHaveBeenCalled();
      expect(dialog).toBeInTheDocument();
    } finally {
      document.removeEventListener('mousedown', outsideMouseDown);
    }
  });

  it('preserves an open dialog and its scroll position across library updates', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<LibraryHarness />);
    const opener = await screen.findByRole('button', { name: 'View information for Tomato' });
    const libraryScroller = container.querySelector('[data-scroll-container="plants"]');
    fireEvent.scroll(libraryScroller, { target: { scrollTop: 1200 } });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Tomato' });
    await waitFor(() => expect(dialog).toHaveFocus());
    const details = within(dialog).getByRole('region', { name: 'Plant details' });
    expect(details.scrollTop).toBe(0);
    fireEvent.scroll(details, { target: { scrollTop: 500 } });
    details.focus();

    rerender(<LibraryHarness searchTerm="Tom" />);
    expect(screen.getByRole('dialog', { name: 'Tomato' })).toBe(dialog);
    expect(details.scrollTop).toBe(500);
    expect(details).toHaveFocus();
    expect(libraryScroller.scrollTop).toBe(1200);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    await user.click(opener);
    expect(screen.getByRole('region', { name: 'Plant details' }).scrollTop).toBe(0);
  });

  it('supports short records with missing optional details', async () => {
    const user = userEvent.setup();
    render(<LibraryHarness />);
    const { dialog } = await openDetails(user, 'Basil');
    expect(within(dialog).queryByRole('heading', { name: 'Description' })).not.toBeInTheDocument();
    expect(within(dialog).getAllByText('Not specified.').length).toBeGreaterThan(0);
    await user.click(within(dialog).getByRole('button', { name: 'Close plant details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
