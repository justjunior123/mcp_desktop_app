import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <div>Test Content</div>
      </Card>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders title and description when provided', () => {
    render(
      <Card title="Test Title" description="Test Description">
        Content
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Card footer={<div>Footer Content</div>}>
        Content
      </Card>
    );
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick}>
        Content
      </Card>
    );
    
    fireEvent.click(screen.getByText('Content'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies hover styles when clickable', () => {
    render(
      <Card onClick={() => {}}>
        Content
      </Card>
    );
    
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveClass('transition-shadow');
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-class">
        Content
      </Card>
    );
    
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('custom-class');
  });
}); 