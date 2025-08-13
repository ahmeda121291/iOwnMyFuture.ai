import React from 'react'
import { cn } from '../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gradient'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  rounded?: 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const Button = React.memo(function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  onClick, 
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  rounded = 'full',
  className = '',
  type = 'button',
  ...props 
}: ButtonProps) {
  // Base classes for all buttons
  const baseClasses = cn(
    'relative inline-flex items-center justify-center',
    'font-semibold transition-all duration-300',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[0.98]',
    fullWidth && 'w-full'
  )
  
  // Variant-specific styles with improved gradients and hover effects
  const variantClasses = {
    primary: cn(
      'bg-gradient-to-r from-primary-500 to-primary-600',
      'text-white shadow-lg shadow-primary-500/25',
      'hover:from-primary-600 hover:to-primary-700',
      'hover:shadow-xl hover:shadow-primary-500/30',
      'hover:-translate-y-0.5 hover:scale-[1.02]',
      'focus-visible:ring-primary-500'
    ),
    secondary: cn(
      'bg-white/90 backdrop-blur-sm',
      'text-primary-700 border-2 border-primary-200',
      'hover:bg-primary-50 hover:border-primary-300',
      'hover:shadow-lg hover:-translate-y-0.5',
      'focus-visible:ring-primary-300'
    ),
    gradient: cn(
      'bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600',
      'text-white shadow-xl shadow-accent-500/30',
      'hover:from-primary-600 hover:via-accent-600 hover:to-primary-700',
      'hover:shadow-2xl hover:shadow-accent-500/40',
      'hover:-translate-y-0.5 hover:scale-[1.02]',
      'focus-visible:ring-accent-500',
      'animate-gradient-x'
    ),
    ghost: cn(
      'bg-transparent text-primary-600',
      'hover:bg-primary-50 hover:text-primary-700',
      'focus-visible:ring-primary-400'
    ),
    danger: cn(
      'bg-gradient-to-r from-error-500 to-error-600',
      'text-white shadow-lg shadow-error-500/25',
      'hover:from-error-600 hover:to-error-700',
      'hover:shadow-xl hover:shadow-error-500/30',
      'hover:-translate-y-0.5',
      'focus-visible:ring-error-500'
    ),
    success: cn(
      'bg-gradient-to-r from-success-500 to-green-600',
      'text-white shadow-lg shadow-success-500/25',
      'hover:from-green-600 hover:to-green-700',
      'hover:shadow-xl hover:shadow-success-500/30',
      'hover:-translate-y-0.5',
      'focus-visible:ring-success-500'
    )
  }
  
  // Size classes with better mobile responsiveness
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs gap-1.5',
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base gap-2',
    lg: 'px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg gap-2.5',
    xl: 'px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl gap-3'
  }

  // Rounded corner variants
  const roundedClasses = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }

  // Combine all classes
  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    roundedClasses[rounded],
    className
  )

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  return (
    <button 
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <LoadingSpinner />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </>
      )}
    </button>
  )
})

export default Button