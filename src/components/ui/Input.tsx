import React from 'react';
import classNames from 'classnames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={classNames(
          'block w-full rounded-md shadow-sm',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error
            ? 'border-red-300 text-red-900 placeholder-red-300'
            : 'border-gray-300 text-gray-900',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {(error || helperText) && (
        <p
          className={classNames(
            'mt-1 text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}
          id={error ? `${inputId}-error` : undefined}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}; 