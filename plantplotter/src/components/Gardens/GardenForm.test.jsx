import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GardenForm from './GardenForm';

const renderGardenForm = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const user = userEvent.setup();

  render(
    <GardenForm
      isOpen
      garden={null}
      onSave={onSave}
      onClose={onClose}
      {...props}
    />
  );

  return { onSave, onClose, user };
};

const fillRequiredFields = async (user, {
  name = 'Kitchen Garden',
  width = '12',
  height = '8'
} = {}) => {
  await user.type(screen.getByPlaceholderText('Enter garden name'), name);

  const [widthInput, heightInput] = screen.getAllByRole('spinbutton');
  await user.type(widthInput, width);
  await user.type(heightInput, height);
};

const submitForm = async (user) => {
  await user.click(screen.getByRole('button', { name: /create garden/i }));
};

describe('GardenForm validation', () => {
  it('associates visible labels with every garden form control', () => {
    renderGardenForm();

    expect(screen.getByLabelText('Garden Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Soil Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Width (m) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Height (m) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('shows required messages for garden name, width, and height', async () => {
    const { user, onSave } = renderGardenForm();

    await submitForm(user);

    expect(await screen.findByText('Garden name is required.')).toBeInTheDocument();
    expect(screen.getByText('Width is required.')).toBeInTheDocument();
    expect(screen.getByText('Height is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a spaces-only garden name', async () => {
    const { user, onSave } = renderGardenForm();

    await fillRequiredFields(user, { name: '   ' });
    await submitForm(user);

    expect(await screen.findByText('Garden name is required.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows metric range messages using m for dimensions below the allowed range', async () => {
    const { user, onSave } = renderGardenForm();

    await fillRequiredFields(user, { width: '0', height: '0' });
    await submitForm(user);

    expect(await screen.findByText('Width must be between 1 and 100 m.')).toBeInTheDocument();
    expect(screen.getByText('Height must be between 1 and 100 m.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows metric range messages using m for dimensions above the allowed range', async () => {
    const { user, onSave } = renderGardenForm();

    await fillRequiredFields(user, { width: '101', height: '101' });
    await submitForm(user);

    expect(await screen.findByText('Width must be between 1 and 100 m.')).toBeInTheDocument();
    expect(screen.getByText('Height must be between 1 and 100 m.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows imperial range messages using ft when imperial units are selected', async () => {
    const { user, onSave } = renderGardenForm();

    await user.click(screen.getByRole('button', { name: /metric/i }));
    await fillRequiredFields(user, { width: '3', height: '329' });
    await submitForm(user);

    expect(await screen.findByText('Width must be between 3.3 and 328 ft.')).toBeInTheDocument();
    expect(screen.getByText('Height must be between 3.3 and 328 ft.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits valid garden data and defaults an empty location to Garden', async () => {
    const { user, onSave } = renderGardenForm();

    await fillRequiredFields(user);
    await submitForm(user);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Kitchen Garden',
      width: 12,
      height: 8,
      location: 'Garden',
      dimensions: {
        width: 12,
        height: 8
      }
    }));
  });
});
