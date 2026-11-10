import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PopulationTable } from './LakePage';

describe('PopulationTable', () => {
  it('shows remaining, reserved and available as separate server values', () => {
    render(<PopulationTable rows={[{ speciesId: 'perch', remaining: 130, reserved: 5, available: 125, stocked: 300, caught: 170 }]} updatedAt={null} />);

    const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);
    expect(cells).toEqual(['perch', '130', '5', '125', '300', '170']);
    expect(screen.getByText('Còn câu được').getAttribute('title')).toBe('available = remaining − reserved');
  });
});
