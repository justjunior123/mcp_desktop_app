import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-500');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary-500');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-error-500');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3 py-2 text-sm');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3 text-base');
  });

  it('handles loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
    expect(screen.getByRole('button')).toContainHTML('animate-spin');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;
    
    render(
      <Button leftIcon={leftIcon} rightIcon={rightIcon}>
        With Icons
      </Button>
    );
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('handles fullWidth prop', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} loading>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('IconButton Component', () => {
  it('renders with icon', () => {
    const icon = <span data-testid="icon">🚀</span>;
    render(<IconButton icon={icon} aria-label="Launch" />);
    
    const button = screen.getByRole('button', { name: 'Launch' });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('has square aspect ratio', () => {
    const icon = <span>🚀</span>;
    render(<IconButton icon={icon} aria-label="Launch" />);
    
    expect(screen.getByRole('button')).toHaveClass('aspect-square');
  });

  it('handles different sizes', () => {
    const icon = <span>🚀</span>;
    const { rerender } = render(<IconButton icon={icon} aria-label="Launch" size="sm" />);
    
    expect(screen.getByRole('button')).toHaveClass('p-2');
    
    rerender(<IconButton icon={icon} aria-label="Launch" size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('p-3');
  });
});

describe('ButtonGroup Component', () => {
  it('renders multiple buttons', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Third' })).toBeInTheDocument();
  });

  it('applies correct rounded styles to first and last buttons', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Middle</Button>
        <Button>Last</Button>
      </ButtonGroup>
    );
    
    const firstButton = screen.getByRole('button', { name: 'First' });
    const middleButton = screen.getByRole('button', { name: 'Middle' });
    const lastButton = screen.getByRole('button', { name: 'Last' });
    
    expect(firstButton).toHaveClass('rounded-r-none');
    expect(middleButton).toHaveClass('rounded-none');
    expect(lastButton).toHaveClass('rounded-l-none');
  });
});