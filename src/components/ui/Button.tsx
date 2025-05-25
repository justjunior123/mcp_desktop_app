import React from 'react'
import { clsx } from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500 text-white shadow-sm border-primary-500',
  secondary: 'bg-secondary-500 hover:bg-secondary-600 focus:ring-secondary-500 text-white shadow-sm border-secondary-500',
  accent: 'bg-accent-500 hover:bg-accent-600 focus:ring-accent-500 text-white shadow-sm border-accent-500',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-500 text-slate-700 dark:text-slate-300 border-transparent',
  danger: 'bg-error-500 hover:bg-error-600 focus:ring-error-500 text-white shadow-sm border-error-500',
  success: 'bg-success-500 hover:bg-success-600 focus:ring-success-500 text-white shadow-sm border-success-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
}

const iconSizeStyles: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center',
        'font-medium rounded-lg border',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
        
        // Variant styles
        variantStyles[variant],
        
        // Size styles
        sizeStyles[size],
        
        // Width styles
        fullWidth ? 'w-full' : 'w-auto',
        
        // Disabled styles
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        
        // Loading styles
        loading && 'relative',
        
        // Custom className
        className
      )}
      {...props}
    >
      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={clsx(
            'animate-spin rounded-full border-2 border-current border-t-transparent',
            iconSizeStyles[size]
          )} />
        </div>
      )}

      {/* Content wrapper - hidden when loading */}
      <div className={clsx('flex items-center space-x-2', loading && 'invisible')}>
        {leftIcon && (
          <span className={clsx('flex-shrink-0', iconSizeStyles[size])}>
            {leftIcon}
          </span>
        )}
        
        <span>{children}</span>
        
        {rightIcon && (
          <span className={clsx('flex-shrink-0', iconSizeStyles[size])}>
            {rightIcon}
          </span>
        )}
      </div>
    </button>
  )
}

// Icon button variant for buttons with only icons
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  'aria-label': string
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 'md',
  className,
  ...props
}) => {
  const iconOnlyPadding: Record<ButtonSize, string> = {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4',
  }

  return (
    <Button
      size={size}
      className={clsx(iconOnlyPadding[size], 'aspect-square', className)}
      {...props}
    >
      <span className={iconSizeStyles[size]}>
        {icon}
      </span>
    </Button>
  )
}

// Button group for related actions
export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className }) => {
  return (
    <div className={clsx('inline-flex rounded-lg shadow-sm', className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0
          const isLast = index === React.Children.count(children) - 1
          
          return React.cloneElement(child, {
            className: clsx(
              child.props.className,
              !isFirst && '-ml-px',
              !isFirst && !isLast && 'rounded-none',
              isFirst && 'rounded-r-none',
              isLast && 'rounded-l-none',
              'focus:z-10'
            ),
          })
        }
        return child
      })}
    </div>
  )
} 