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
  const baseClasses = 'btn'
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary'
  }
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3',
    large: 'px-8 py-4 text-lg'
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
    disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
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
