import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Golf Stats Tracker app', () => {
  render(<App />);
  const titleElement = screen.getByText(/Golf Stats Tracker/i);
  expect(titleElement).toBeInTheDocument();
});
