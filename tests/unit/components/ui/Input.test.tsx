import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Input, Textarea, InputGroup } from '@/components/ui/Input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('bg-white dark:bg-slate-900');
  });

  it('renders with label', () => {
    render(<Input label="Username" />);
    const label = screen.getByText('Username');
    const input = screen.getByLabelText('Username');
    
    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  it('renders with required indicator', () => {
    render(<Input label="Password" required />);
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass('text-error-500');
  });

  it('renders with error state', () => {
    render(<Input label="Email" error="Invalid email format" />);
    const input = screen.getByLabelText('Email');
    const errorMessage = screen.getByText('Invalid email format');
    
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('border-error-300');
    expect(errorMessage).toHaveClass('text-error-600');
  });

  it('renders with helper text', () => {
    render(<Input label="Username" helperText="Must be at least 3 characters" />);
    const helperText = screen.getByText('Must be at least 3 characters');
    expect(helperText).toHaveClass('text-slate-500');
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">@</span>;
    const rightIcon = <span data-testid="right-icon">✓</span>;
    
    render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('handles different sizes', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-3 py-2 text-sm');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-5 py-4 text-base');
  });

  it('handles different variants', () => {
    const { rerender } = render(<Input variant="filled" />);
    expect(screen.getByRole('textbox')).toHaveClass('bg-slate-50');

    rerender(<Input variant="ghost" />);
    expect(screen.getByRole('textbox')).toHaveClass('bg-transparent border-transparent');
  });

  it('handles disabled state', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('calls onChange handler', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('handles focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});

describe('Textarea Component', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter description" />);
    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('rows', '4');
  });

  it('renders with label', () => {
    render(<Textarea label="Description" />);
    const label = screen.getByText('Description');
    const textarea = screen.getByLabelText('Description');
    
    expect(label).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
  });

  it('renders with error state', () => {
    render(<Textarea label="Message" error="Message is required" />);
    const textarea = screen.getByLabelText('Message');
    const errorMessage = screen.getByText('Message is required');
    
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveClass('border-error-300');
    expect(errorMessage).toHaveClass('text-error-600');
  });

  it('handles different resize options', () => {
    const { rerender } = render(<Textarea resize="none" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize-none');

    rerender(<Textarea resize="horizontal" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize-x');

    rerender(<Textarea resize="both" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize');
  });

  it('handles custom rows', () => {
    render(<Textarea rows={8} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8');
  });

  it('handles disabled state', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('calls onChange handler', () => {
    const handleChange = jest.fn();
    render(<Textarea onChange={handleChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});

describe('InputGroup Component', () => {
  it('renders multiple inputs', () => {
    render(
      <InputGroup>
        <Input placeholder="First" />
        <Input placeholder="Second" />
        <Input placeholder="Third" />
      </InputGroup>
    );
    
    expect(screen.getByPlaceholderText('First')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Second')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Third')).toBeInTheDocument();
  });

  it('applies correct rounded styles to grouped inputs', () => {
    render(
      <InputGroup>
        <Input placeholder="First" />
        <Input placeholder="Middle" />
        <Input placeholder="Last" />
      </InputGroup>
    );
    
    const firstInput = screen.getByPlaceholderText('First');
    const middleInput = screen.getByPlaceholderText('Middle');
    const lastInput = screen.getByPlaceholderText('Last');
    
    expect(firstInput).toHaveClass('rounded-r-none');
    expect(middleInput).toHaveClass('rounded-none');
    expect(lastInput).toHaveClass('rounded-l-none');
  });
});