import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card Component', () => {
  it('renders children content', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Card title="Test Card">
        <p>Content</p>
      </Card>
    );
    
    const title = screen.getByText('Test Card');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-lg font-medium text-gray-900');
  });

  it('renders with description', () => {
    render(
      <Card title="Test Card" description="This is a test card">
        <p>Content</p>
      </Card>
    );
    
    const description = screen.getByText('This is a test card');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('mt-1 text-sm text-gray-500');
  });

  it('renders with footer', () => {
    const footer = <button>Footer Button</button>;
    render(
      <Card footer={footer}>
        <p>Content</p>
      </Card>
    );
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick}>
        <p>Clickable card</p>
      </Card>
    );
    
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('cursor-pointer hover:shadow-md transition-shadow');
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not have click styles when onClick is not provided', () => {
    render(
      <Card>
        <p>Non-clickable card</p>
      </Card>
    );
    
    const card = screen.getByRole('presentation');
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-class">
        <p>Content</p>
      </Card>
    );
    
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('custom-class');
  });

  it('renders header section only when title or description is provided', () => {
    const { container: withoutHeader } = render(
      <Card>
        <p>Content</p>
      </Card>
    );
    
    expect(withoutHeader.querySelector('.border-b')).not.toBeInTheDocument();
    
    const { container: withHeader } = render(
      <Card title="Title">
        <p>Content</p>
      </Card>
    );
    
    expect(withHeader.querySelector('.border-b')).toBeInTheDocument();
  });

  it('renders footer section only when footer is provided', () => {
    const { container: withoutFooter } = render(
      <Card>
        <p>Content</p>
      </Card>
    );
    
    expect(withoutFooter.querySelector('.bg-gray-50')).not.toBeInTheDocument();
    
    const { container: withFooter } = render(
      <Card footer={<span>Footer</span>}>
        <p>Content</p>
      </Card>
    );
    
    expect(withFooter.querySelector('.bg-gray-50')).toBeInTheDocument();
  });
});