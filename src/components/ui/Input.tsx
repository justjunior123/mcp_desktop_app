import React from 'react'
import { clsx } from 'clsx'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputVariant = 'default' | 'filled' | 'ghost'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  size?: InputSize
  variant?: InputVariant
  fullWidth?: boolean
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  size?: InputSize
  variant?: InputVariant
  fullWidth?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
  lg: 'px-5 py-4 text-base',
}

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600',
  filled: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
  ghost: 'bg-transparent border-transparent',
}

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  className,
  id,
  disabled,
  required,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || 'input'
  const hasError = Boolean(error)
  const hasLeftIcon = Boolean(leftIcon)
  const hasRightIcon = Boolean(rightIcon)

  return (
    <div className={clsx('relative', fullWidth && 'w-full')}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block text-sm font-medium mb-2 transition-colors',
            hasError
              ? 'text-error-700 dark:text-error-400'
              : 'text-slate-700 dark:text-slate-300',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        {hasLeftIcon && (
          <div className={clsx(
            'absolute left-0 top-0 h-full flex items-center pl-3 pointer-events-none',
            hasError ? 'text-error-500' : 'text-slate-400 dark:text-slate-500'
          )}>
            <span className={iconSizeStyles[size]}>
              {leftIcon}
            </span>
          </div>
        )}

        {/* Input field */}
        <input
          id={inputId}
          disabled={disabled}
          className={clsx(
            // Base styles
            'block w-full rounded-lg border transition-all duration-200',
            'text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
            
            // Size styles
            sizeStyles[size],
            
            // Variant styles
            variantStyles[variant],
            
            // Icon padding
            hasLeftIcon && 'pl-10',
            hasRightIcon && 'pr-10',
            
            // State styles
            hasError
              ? 'border-error-300 dark:border-error-600 focus:border-error-500 focus:ring-error-500'
              : 'focus:border-primary-500 focus:ring-primary-500',
            
            // Disabled styles
            disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800',
            
            className
          )}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />

        {/* Right icon */}
        {hasRightIcon && (
          <div className={clsx(
            'absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none',
            hasError ? 'text-error-500' : 'text-slate-400 dark:text-slate-500'
          )}>
            <span className={iconSizeStyles[size]}>
              {rightIcon}
            </span>
          </div>
        )}
      </div>

      {/* Helper text or error message */}
      {(error || helperText) && (
        <p
          className={clsx(
            'mt-2 text-sm transition-colors',
            hasError
              ? 'text-error-600 dark:text-error-400'
              : 'text-slate-500 dark:text-slate-400'
          )}
          id={error ? `${inputId}-error` : `${inputId}-helper`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  resize = 'vertical',
  className,
  id,
  disabled,
  required,
  rows = 4,
  ...props
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-') || 'textarea'
  const hasError = Boolean(error)

  const resizeStyles = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  }

  return (
    <div className={clsx('relative', fullWidth && 'w-full')}>
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className={clsx(
            'block text-sm font-medium mb-2 transition-colors',
            hasError
              ? 'text-error-700 dark:text-error-400'
              : 'text-slate-700 dark:text-slate-300',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Textarea field */}
      <textarea
        id={textareaId}
        disabled={disabled}
        rows={rows}
        className={clsx(
          // Base styles
          'block w-full rounded-lg border transition-all duration-200',
          'text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
          
          // Size styles
          sizeStyles[size],
          
          // Variant styles
          variantStyles[variant],
          
          // Resize styles
          resizeStyles[resize],
          
          // State styles
          hasError
            ? 'border-error-300 dark:border-error-600 focus:border-error-500 focus:ring-error-500'
            : 'focus:border-primary-500 focus:ring-primary-500',
          
          // Disabled styles
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800',
          
          className
        )}
        aria-invalid={hasError}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />

      {/* Helper text or error message */}
      {(error || helperText) && (
        <p
          className={clsx(
            'mt-2 text-sm transition-colors',
            hasError
              ? 'text-error-600 dark:text-error-400'
              : 'text-slate-500 dark:text-slate-400'
          )}
          id={error ? `${textareaId}-error` : `${textareaId}-helper`}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}

// Input group for combining multiple inputs
export interface InputGroupProps {
  children: React.ReactNode
  className?: string
}

export const InputGroup: React.FC<InputGroupProps> = ({ children, className }) => {
  return (
    <div className={clsx('flex', className)}>
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