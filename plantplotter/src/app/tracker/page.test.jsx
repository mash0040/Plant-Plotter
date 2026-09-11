import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useTrackerGardens from '@/hooks/useTrackerGardens';
import TrackingPage from './page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search)
}));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('@/hooks/useTrackerGardens', () => ({ default: vi.fn() }));
vi.mock('@/hooks/useTrackerActivities', () => ({ default: () => ({ calendarData: {} }) }));
vi.mock('@/hooks/useTrackerTasks', () => ({ default: () => ({}) }));
vi.mock('@/hooks/useWeather', () => ({ useWeather: () => ({}) }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/tracker');
  useTrackerGardens.mockReturnValue({ gardens: [], selectedGarden: null });
});

describe('Tracker garden creation entry', () => {
  it('links the no-garden action directly to the shared creation flow', () => {
    render(<TrackingPage />);
    expect(screen.getByRole('link', { name: 'Create Garden' })).toHaveAttribute(
      'href', '/gardens?create=true&returnTo=/tracker'
    );
  });

  it('keeps navigation and retry actions when the garden list fails to load', () => {
    useTrackerGardens.mockReturnValue({ gardens: [], gardenLoadError: 'Service unavailable', loadGardens: vi.fn() });
    render(<TrackingPage />);
    expect(screen.getByRole('link', { name: 'Go to My Gardens' })).toHaveAttribute('href', '/gardens');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create Garden' })).not.toBeInTheDocument();
  });

  it('passes the returned garden ID to garden loading', () => {
    window.history.replaceState(null, '', '/tracker?gardenId=42');
    render(<TrackingPage />);
    expect(useTrackerGardens).toHaveBeenCalledWith(expect.objectContaining({ initialGardenId: '42' }));
  });
});
