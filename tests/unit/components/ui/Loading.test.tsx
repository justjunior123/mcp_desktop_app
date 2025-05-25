import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  Spinner, 
  LoadingScreen, 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonCard, 
  Progress, 
  Pulse, 
  LoadingOverlay 
} from '@/components/ui/Loading';

describe('Spinner Component', () => {
  it('renders with default props', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    
    expect(spinner).toHaveClass('animate-spin rounded-full border-2 w-6 h-6 border-primary-200 border-t-primary-500');
  });

  it('renders different sizes', () => {
    const { container: smallContainer } = render(<Spinner size="sm" />);
    const smallSpinner = smallContainer.firstChild as HTMLElement;
    expect(smallSpinner).toHaveClass('w-4 h-4');

    const { container: largeContainer } = render(<Spinner size="xl" />);
    const largeSpinner = largeContainer.firstChild as HTMLElement;
    expect(largeSpinner).toHaveClass('w-12 h-12');
  });

  it('renders different colors', () => {
    const { container: whiteContainer } = render(<Spinner color="white" />);
    const whiteSpinner = whiteContainer.firstChild as HTMLElement;
    expect(whiteSpinner).toHaveClass('border-white/20 border-t-white');

    const { container: secondaryContainer } = render(<Spinner color="secondary" />);
    const secondarySpinner = secondaryContainer.firstChild as HTMLElement;
    expect(secondarySpinner).toHaveClass('border-secondary-200 border-t-secondary-500');
  });
});

describe('LoadingScreen Component', () => {
  it('renders with default title', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom title and message', () => {
    render(<LoadingScreen title="Processing" message="Please wait while we process your request" />);
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we process your request')).toBeInTheDocument();
  });

  it('renders spinner', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('Skeleton Component', () => {
  it('renders single skeleton', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveClass('animate-pulse bg-slate-200 dark:bg-slate-700 rounded');
  });

  it('renders multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    
    expect(skeletons).toHaveLength(3);
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="40px" />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveStyle({ width: '200px', height: '40px' });
  });

  it('renders rounded skeleton', () => {
    const { container } = render(<Skeleton rounded />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveClass('rounded-full');
  });
});

describe('SkeletonText Component', () => {
  it('renders default number of lines', () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    
    expect(skeletons).toHaveLength(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    
    expect(skeletons).toHaveLength(5);
  });
});

describe('SkeletonAvatar Component', () => {
  it('renders rounded skeleton', () => {
    const { container } = render(<SkeletonAvatar />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveClass('rounded-full');
    expect(skeleton).toHaveStyle({ width: '2.5rem', height: '2.5rem' });
  });

  it('applies custom size', () => {
    const { container } = render(<SkeletonAvatar size="4rem" />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveStyle({ width: '4rem', height: '4rem' });
  });
});

describe('SkeletonButton Component', () => {
  it('renders button-shaped skeleton', () => {
    const { container } = render(<SkeletonButton />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveClass('rounded-lg');
    expect(skeleton).toHaveStyle({ width: '6rem', height: '2.25rem' });
  });

  it('applies custom width', () => {
    const { container } = render(<SkeletonButton width="8rem" />);
    const skeleton = container.firstChild as HTMLElement;
    
    expect(skeleton).toHaveStyle({ width: '8rem' });
  });
});

describe('SkeletonCard Component', () => {
  it('renders card skeleton with multiple elements', () => {
    const { container } = render(<SkeletonCard />);
    
    expect(container.querySelector('.p-6')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
  });
});

describe('Progress Component', () => {
  it('renders progress bar with value', () => {
    render(<Progress value={50} showLabel />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    const { container } = render(<Progress value={75} max={100} />);
    const progressBar = container.querySelector('[style*="width: 75%"]');
    
    expect(progressBar).toBeInTheDocument();
  });

  it('handles values exceeding max', () => {
    const { container } = render(<Progress value={150} max={100} />);
    const progressBar = container.querySelector('[style*="width: 100%"]');
    
    expect(progressBar).toBeInTheDocument();
  });

  it('handles negative values', () => {
    const { container } = render(<Progress value={-10} max={100} />);
    const progressBar = container.querySelector('[style*="width: 0%"]');
    
    expect(progressBar).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { container: smallContainer } = render(<Progress value={50} size="sm" />);
    expect(smallContainer.querySelector('.h-1')).toBeInTheDocument();

    const { container: largeContainer } = render(<Progress value={50} size="lg" />);
    expect(largeContainer.querySelector('.h-3')).toBeInTheDocument();
  });
});

describe('Pulse Component', () => {
  it('renders pulsing indicator', () => {
    const { container } = render(<Pulse />);
    
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    expect(container.querySelector('.bg-primary-500')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { container } = render(<Pulse size="lg" />);
    const elements = container.querySelectorAll('.w-8.h-8');
    
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders different colors', () => {
    const { container } = render(<Pulse color="accent" />);
    
    expect(container.querySelector('.bg-accent-500')).toBeInTheDocument();
  });
});

describe('LoadingOverlay Component', () => {
  it('renders children when not visible', () => {
    render(
      <LoadingOverlay isVisible={false}>
        <div>Child content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders overlay when visible', () => {
    render(
      <LoadingOverlay isVisible={true}>
        <div>Child content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(
      <LoadingOverlay isVisible={true} message="Processing...">
        <div>Child content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('has correct overlay styles', () => {
    const { container } = render(
      <LoadingOverlay isVisible={true}>
        <div>Child content</div>
      </LoadingOverlay>
    );
    
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toHaveClass('bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm');
  });
});