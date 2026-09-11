import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api';
import { API_ERROR_CODES } from '@/lib/apiErrors';
import AllGardensPage from './page';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ replace })
}));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('@/lib/api', () => ({ default: {
  getGardenSummaries: vi.fn(), createGarden: vi.fn(), updateGarden: vi.fn()
} }));

const newGarden = { id: 42, name: 'Kitchen Garden', width: 12, height: 8, status: 'Planning' };
const openPage = (query = '?create=true&returnTo=/tracker') => {
  window.history.replaceState(null, '', `/gardens${query}`);
  return render(<AllGardensPage />);
};
const fillForm = async (user) => {
  await screen.findByRole('dialog', { name: 'New Garden' });
  await user.type(screen.getByLabelText('Garden Name *'), 'Kitchen Garden');
  await user.type(screen.getByLabelText('Width (m) *'), '12');
  await user.type(screen.getByLabelText('Height (m) *'), '8');
};
const save = async (user) => user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Garden' }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  apiClient.getGardenSummaries.mockResolvedValue([]);
  apiClient.createGarden.mockResolvedValue(newGarden);
  replace.mockImplementation(url => window.history.replaceState(null, '', url));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('direct garden creation', () => {
  it('opens a new creation request when My Gardens is already mounted', async () => {
    const page = openPage('');
    await screen.findByRole('button', { name: 'Create Garden' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/gardens?create=true&returnTo=/tracker');
    page.rerender(<AllGardensPage />);
    expect(await screen.findByRole('dialog', { name: 'New Garden' })).toBeInTheDocument();
  });

  it('opens the existing form after loading and consumes only creation parameters', async () => {
    let resolveLoad;
    apiClient.getGardenSummaries.mockReturnValue(new Promise(resolve => { resolveLoad = resolve; }));
    openPage('?create=true&returnTo=/tracker&view=list');
    expect(screen.getByText('Loading gardens...')).toBeInTheDocument();
    await act(async () => resolveLoad([]));
    expect(await screen.findByRole('dialog', { name: 'New Garden' })).toBeInTheDocument();
    expect(window.location.search).toBe('?view=list');
  });

  it.each(['cancel', 'escape', 'close'])('stays on My Gardens after %s and does not reopen on remount', async (method) => {
    const user = userEvent.setup();
    const page = openPage();
    const dialog = await screen.findByRole('dialog', { name: 'New Garden' });
    if (method === 'escape') {
      await waitFor(() => expect(screen.getByLabelText('Garden Name *')).toHaveFocus());
      await user.keyboard('{Escape}');
    }
    else await user.click(within(dialog).getByRole('button', { name: method === 'cancel' ? 'Cancel' : /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe('/gardens');
    expect(replace).not.toHaveBeenCalled();
    page.unmount();
    render(<AllGardensPage />);
    await screen.findByRole('button', { name: 'Create Garden' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns to Tracker only after a successful save, with the new garden ID', async () => {
    const user = userEvent.setup();
    let resolveSave;
    apiClient.createGarden.mockReturnValue(new Promise(resolve => { resolveSave = resolve; }));
    openPage();
    await fillForm(user);
    await save(user);
    expect(replace).not.toHaveBeenCalled();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => resolveSave(newGarden));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/tracker?gardenId=42'));
    expect(apiClient.createGarden).toHaveBeenCalledTimes(1);
    expect(apiClient.getGardenSummaries).toHaveBeenCalledTimes(1);
  });

  it.each(['', '/gardens', 'https://evil.example', '//evil.example', 'javascript:alert(1)', '/tracker?next=https://evil.example', '/tracker/../elsewhere'])('ignores unsupported return destination %j', async (returnTo) => {
    const user = userEvent.setup();
    openPage(`?create=true&returnTo=${encodeURIComponent(returnTo)}`);
    await fillForm(user);
    await save(user);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/gardens');
    expect(screen.getByText('Garden created.')).toBeInTheDocument();
  });

  it.each(['', '?create=false&returnTo=/tracker', '?returnTo=/tracker'])('preserves manual creation for ordinary visits (%s)', async (query) => {
    const user = userEvent.setup();
    openPage(query);
    await user.click(await screen.findByRole('button', { name: 'Create Garden' }));
    await fillForm(user);
    await save(user);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('Garden created.')).toBeInTheDocument();
  });

  it('clears the return destination when a cancelled creation is opened manually', async () => {
    const user = userEvent.setup();
    openPage();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Create Garden' }));
    await fillForm(user);
    await save(user);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps validation failures in the form and allows a corrected save', async () => {
    const user = userEvent.setup();
    openPage();
    await screen.findByRole('dialog');
    await save(user);
    expect(screen.getByText('Garden name is required.')).toBeInTheDocument();
    expect(apiClient.createGarden).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    await fillForm(user);
    await save(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/tracker?gardenId=42'));
  });

  it.each([
    Object.assign(new Error('Service temporarily unavailable. Please try again shortly.'), { status: 503, code: API_ERROR_CODES.SERVICE_UNAVAILABLE }),
    new Error('Unexpected failure'),
    Object.assign(new Error('Invalid name'), { status: 400, errors: { name: 'Please choose another name.' } })
  ])('preserves the draft and return destination after a save error ($message)', async (error) => {
    apiClient.createGarden.mockRejectedValueOnce(error).mockResolvedValueOnce(newGarden);
    const user = userEvent.setup();
    openPage();
    await fillForm(user);
    await save(user);
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Garden' })).toBeEnabled());
    expect(screen.getByLabelText('Garden Name *')).toHaveValue('Kitchen Garden');
    expect(replace).not.toHaveBeenCalled();
    expect(apiClient.createGarden).toHaveBeenCalledTimes(1);
    await save(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/tracker?gardenId=42'));
    expect(apiClient.createGarden).toHaveBeenCalledTimes(2);
  });

  it('allows cancelling after a list outage and retrying the garden load', async () => {
    apiClient.getGardenSummaries.mockRejectedValueOnce(Object.assign(new Error('Service temporarily unavailable.'), {
      status: 503, code: API_ERROR_CODES.SERVICE_UNAVAILABLE
    })).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    openPage();
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Gardens unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('button', { name: 'Create Garden' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
