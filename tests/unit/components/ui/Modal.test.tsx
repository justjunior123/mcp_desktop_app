import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal, ConfirmModal, LoadingModal } from '@/components/ui/Modal';

describe('Modal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toHaveClass('text-xl font-semibold');
  });

  it('renders close button by default', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} showCloseButton={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    const backdrop = screen.getByText('Modal content').closest('.fixed');
    fireEvent.click(backdrop!);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when overlay is clicked and closeOnOverlayClick is false', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    const backdrop = screen.getByText('Modal content').closest('.fixed');
    fireEvent.click(backdrop!);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm">
        <p>Small modal</p>
      </Modal>
    );
    
    let modalContent = screen.getByText('Small modal').closest('div');
    expect(modalContent).toHaveClass('max-w-md');
    
    rerender(
      <Modal isOpen={true} onClose={mockOnClose} size="xl">
        <p>Large modal</p>
      </Modal>
    );
    
    modalContent = screen.getByText('Large modal').closest('div');
    expect(modalContent).toHaveClass('max-w-4xl');
  });

  it('closes on escape key when closeOnEscape is true', async () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={true}>
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not close on escape key when closeOnEscape is false', async () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={false}>
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('prevents body scroll when open', () => {
    const originalOverflow = document.body.style.overflow;
    
    const { unmount } = render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    expect(document.body.style.overflow).toBe('unset');
    
    // Restore original value
    document.body.style.overflow = originalOverflow;
  });
});

describe('ConfirmModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with title and message', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
      />
    );
    
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders default buttons', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete"
        message="Delete this item?"
        confirmText="Delete"
        cancelText="Keep"
      />
    );
    
    expect(screen.getByText('Keep')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button is clicked', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('renders danger variant with appropriate icon', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete"
        message="Delete this item?"
        variant="danger"
      />
    );
    
    expect(screen.getByText('🗑️')).toBeInTheDocument();
  });

  it('renders warning variant with appropriate icon', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Warning"
        message="This action cannot be undone"
        variant="warning"
      />
    );
    
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });
});

describe('LoadingModal Component', () => {
  it('renders with default title', () => {
    render(<LoadingModal isOpen={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<LoadingModal isOpen={true} title="Processing..." />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(
      <LoadingModal
        isOpen={true}
        title="Loading"
        message="Please wait while we process your request"
      />
    );
    
    expect(screen.getByText('Please wait while we process your request')).toBeInTheDocument();
  });

  it('renders spinner', () => {
    render(<LoadingModal isOpen={true} />);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('border-4 border-primary-200 border-t-primary-500 rounded-full');
  });

  it('does not render close button', () => {
    render(<LoadingModal isOpen={true} />);
    
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('cannot be closed by clicking overlay or escape key', () => {
    render(<LoadingModal isOpen={true} />);
    
    // Try clicking overlay
    const backdrop = screen.getByText('Loading...').closest('.fixed');
    fireEvent.click(backdrop!);
    
    // Try escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Modal should still be open
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});