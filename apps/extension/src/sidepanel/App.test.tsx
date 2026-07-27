import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('side panel', () => {
  beforeEach(() => localStorage.clear());
  it('renders the demo overview', async () => {
    render(<App />);
    expect(await screen.findByText('Aegis Knight')).toBeInTheDocument();
    expect(screen.getByText('● Demo mode')).toBeInTheDocument();
  });
  it('navigates between views', async () => {
    render(<App />);
    await screen.findByText('Aegis Knight');
    await userEvent.click(screen.getByRole('button', { name: /Inventory/i }));
    expect(screen.getByRole('heading', { name: 'Inventário' })).toBeInTheDocument();
    expect(screen.getByText('Cobra Axe')).toBeInTheDocument();
  });
});
