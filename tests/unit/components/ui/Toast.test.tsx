import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ToastItem, ToastContainer, useToast, ToastProvider, useToastContext } from '@/components/ui/Toast';

describe('ToastItem Component', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with title', () => {
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('renders with message', () => {
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        message="This is a test message"
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('renders different types with correct styles', () => {
    const { rerender } = render(
      <ToastItem
        id="test-toast"
        type="success"
        title="Success"
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Success')).toHaveClass('text-success-800 dark:text-success-200');
    
    rerender(
      <ToastItem
        id="test-toast"
        type="error"
        title="Error"
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('Error')).toHaveClass('text-error-800 dark:text-error-200');
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        onClose={mockOnClose}
      />
    );
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('auto-closes after duration', () => {
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        duration={3000}
        onClose={mockOnClose}
      />
    );
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(mockOnClose).toHaveBeenCalledWith('test-toast');
  });

  it('does not auto-close when duration is 0', () => {
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        duration={0}
        onClose={mockOnClose}
      />
    );
    
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders action button', () => {
    const mockAction = jest.fn();
    render(
      <ToastItem
        id="test-toast"
        type="info"
        title="Test Toast"
        action={{ label: 'Undo', onClick: mockAction }}
        onClose={mockOnClose}
      />
    );
    
    const actionButton = screen.getByText('Undo');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('has correct icon for each type', () => {
    const { container, rerender } = render(
      <ToastItem
        id="test-toast"
        type="success"
        title="Success"
        onClose={mockOnClose}
      />
    );
    
    expect(container.querySelector('.text-success-500')).toBeInTheDocument();
    
    rerender(
      <ToastItem
        id="test-toast"
        type="warning"
        title="Warning"
        onClose={mockOnClose}
      />
    );
    
    expect(container.querySelector('.text-warning-500')).toBeInTheDocument();
  });
});

describe('ToastContainer Component', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onClose={mockOnClose} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders multiple toasts', () => {
    const toasts = [
      { id: '1', type: 'info' as const, title: 'Toast 1' },
      { id: '2', type: 'success' as const, title: 'Toast 2' },
    ];
    
    render(
      <ToastContainer toasts={toasts} onClose={mockOnClose} />
    );
    
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('applies correct position styles', () => {
    const toasts = [{ id: '1', type: 'info' as const, title: 'Toast 1' }];
    
    const { container, rerender } = render(
      <ToastContainer toasts={toasts} position="top-left" onClose={mockOnClose} />
    );
    
    expect(container.firstChild).toHaveClass('top-4 left-4');
    
    rerender(
      <ToastContainer toasts={toasts} position="bottom-right" onClose={mockOnClose} />
    );
    
    expect(container.firstChild).toHaveClass('bottom-4 right-4');
  });
});

describe('useToast Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds and removes toasts', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toHaveLength(0);
    
    act(() => {
      result.current.addToast({
        type: 'info',
        title: 'Test Toast',
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    
    act(() => {
      result.current.removeToast(result.current.toasts[0].id);
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  it('provides convenience methods', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.success('Success!');
      result.current.error('Error!');
      result.current.warning('Warning!');
      result.current.info('Info!');
    });
    
    expect(result.current.toasts).toHaveLength(4);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[1].type).toBe('error');
    expect(result.current.toasts[2].type).toBe('warning');
    expect(result.current.toasts[3].type).toBe('info');
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.success('Toast 1');
      result.current.error('Toast 2');
      result.current.warning('Toast 3');
    });
    
    expect(result.current.toasts).toHaveLength(3);
    
    act(() => {
      result.current.clearAll();
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  it('generates unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast({ type: 'info', title: 'Toast 1' });
      result.current.addToast({ type: 'info', title: 'Toast 2' });
    });
    
    const ids = result.current.toasts.map(t => t.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
  });
});

describe('ToastProvider Component', () => {
  it('provides toast context to children', () => {
    const TestComponent = () => {
      const toast = useToastContext();
      return (
        <button onClick={() => toast.success('Success!')}>
          Add Toast
        </button>
      );
    };
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    
    const button = screen.getByText('Add Toast');
    fireEvent.click(button);
    
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('throws error when useToastContext is used outside provider', () => {
    const TestComponent = () => {
      try {
        useToastContext();
        return <div>Should not render</div>;
      } catch (error) {
        return <div>Error caught</div>;
      }
    };
    
    render(<TestComponent />);
    expect(screen.getByText('Error caught')).toBeInTheDocument();
  });

  it('limits number of visible toasts', () => {
    const TestComponent = () => {
      const toast = useToastContext();
      return (
        <button onClick={() => {
          for (let i = 0; i < 10; i++) {
            toast.info(`Toast ${i}`);
          }
        }}>
          Add Many Toasts
        </button>
      );
    };
    
    render(
      <ToastProvider maxToasts={3}>
        <TestComponent />
      </ToastProvider>
    );
    
    const button = screen.getByText('Add Many Toasts');
    fireEvent.click(button);
    
    // Should only show the last 3 toasts
    expect(screen.getByText('Toast 7')).toBeInTheDocument();
    expect(screen.getByText('Toast 8')).toBeInTheDocument();
    expect(screen.getByText('Toast 9')).toBeInTheDocument();
    expect(screen.queryByText('Toast 0')).not.toBeInTheDocument();
  });
});