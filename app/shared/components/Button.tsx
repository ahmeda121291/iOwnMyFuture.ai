import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  className?: string
}

const Button = React.memo(function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  onClick, 
  disabled = false,
  loading = false,
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary to-accent text-white shadow-soft hover:shadow-soft-lg hover:scale-[1.02] hover:-translate-y-0.5 focus:ring-primary',
    secondary: 'bg-surface text-primary border border-primary-200 hover:bg-primary-50 hover:border-primary-300 hover:-translate-y-0.5 focus:ring-primary-200'
  }
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
    disabled || loading ? 'opacity-50 cursor-not-allowed hover:scale-100 hover:translate-y-0' : ''
  }`

  return (
    <button 
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full spinner"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
})

export default Button
