import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders input element correctly', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(<Input error="Test Error" />);
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text when provided', () => {
    render(<Input helperText="Test Helper" />);
    expect(screen.getByText('Test Helper')).toBeInTheDocument();
  });

  it('generates id from label when not provided', () => {
    render(<Input label="Test Label" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test Label');
    
    expect(input).toHaveAttribute('id', 'test-label');
    expect(label).toHaveAttribute('for', 'test-label');
  });

  it('uses provided id when available', () => {
    render(<Input id="custom-id" label="Test Label" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test Label');
    
    expect(input).toHaveAttribute('id', 'custom-id');
    expect(label).toHaveAttribute('for', 'custom-id');
  });

  it('applies error styles when error is provided', () => {
    render(<Input error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300', 'text-red-900', 'placeholder-red-300');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });
}); 