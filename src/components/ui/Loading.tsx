import React from 'react'
import { clsx } from 'clsx'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerColor = 'primary' | 'secondary' | 'accent' | 'white' | 'current'

export interface SpinnerProps {
  size?: SpinnerSize
  color?: SpinnerColor
  className?: string
}

const spinnerSizes: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

const spinnerColors: Record<SpinnerColor, string> = {
  primary: 'border-primary-200 border-t-primary-500',
  secondary: 'border-secondary-200 border-t-secondary-500',
  accent: 'border-accent-200 border-t-accent-500',
  white: 'border-white/20 border-t-white',
  current: 'border-current/20 border-t-current',
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2',
        spinnerSizes[size],
        spinnerColors[color],
        className
      )}
    />
  )
}

// Loading screen component
export interface LoadingScreenProps {
  title?: string
  message?: string
  size?: SpinnerSize
  className?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Loading...',
  message,
  size = 'lg',
  className,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center p-8', className)}>
      <Spinner size={size} className="mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {message}
        </p>
      )}
    </div>
  )
}

// Skeleton components for loading placeholders
export interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
  lines?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = false,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700'
  
  if (lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              rounded ? 'rounded-full' : 'rounded',
              index < lines - 1 && 'mb-2'
            )}
            style={{
              width: width || '100%',
              height: height || '1rem',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        baseClasses,
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  )
}

// Skeleton variants for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={className}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        height="1rem"
        width={index === lines - 1 ? '75%' : '100%'}
        className={index < lines - 1 ? 'mb-2' : ''}
      />
    ))}
  </div>
)

export const SkeletonAvatar: React.FC<{ size?: string; className?: string }> = ({
  size = '2.5rem',
  className,
}) => (
  <Skeleton
    width={size}
    height={size}
    rounded
    className={className}
  />
)

export const SkeletonButton: React.FC<{ width?: string; className?: string }> = ({
  width = '6rem',
  className,
}) => (
  <Skeleton
    width={width}
    height="2.25rem"
    className={clsx('rounded-lg', className)}
  />
)

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('p-6 border border-slate-200 dark:border-slate-700 rounded-lg', className)}>
    <div className="flex items-center space-x-4 mb-4">
      <SkeletonAvatar />
      <div className="flex-1">
        <Skeleton height="1rem" width="8rem" className="mb-2" />
        <Skeleton height="0.75rem" width="6rem" />
      </div>
    </div>
    <SkeletonText lines={3} />
    <div className="flex space-x-2 mt-4">
      <SkeletonButton />
      <SkeletonButton width="4rem" />
    </div>
  </div>
)

// Progress bar component
export interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: SpinnerColor
  showLabel?: boolean
  className?: string
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const progressColors = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    accent: 'bg-accent-500',
    white: 'bg-white',
    current: 'bg-current',
  }

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden',
          progressSizes[size]
        )}
      >
        <div
          className={clsx(
            'h-full transition-all duration-300 ease-in-out rounded-full',
            progressColors[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Pulsing dot indicator
export interface PulseProps {
  size?: SpinnerSize
  color?: SpinnerColor
  className?: string
}

export const Pulse: React.FC<PulseProps> = ({
  size = 'md',
  color = 'primary',
  className,
}) => {
  const pulseColors = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    accent: 'bg-accent-500',
    white: 'bg-white',
    current: 'bg-current',
  }

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          'rounded-full animate-ping absolute inline-flex opacity-75',
          spinnerSizes[size],
          pulseColors[color]
        )}
      />
      <div
        className={clsx(
          'rounded-full relative inline-flex',
          spinnerSizes[size],
          pulseColors[color]
        )}
      />
    </div>
  )
}

// Loading overlay component
export interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  className?: string
  children?: React.ReactNode
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  className,
  children,
}) => {
  if (!isVisible) return <>{children}</>

  return (
    <div className={clsx('relative', className)}>
      {children}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{message}</p>
        </div>
      </div>
    </div>
  )
}