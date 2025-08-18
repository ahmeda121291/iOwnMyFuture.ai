import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'gradient' | 'ai'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  rounded?: 'md' | 'lg' | 'xl' | 'full'
  glow?: boolean
  sparkle?: boolean
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
  glow = false,
  sparkle = false,
  className = '',
  type = 'button',
  ...props 
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  
  // Base classes for all buttons
  const baseClasses = cn(
    'relative inline-flex items-center justify-center',
    'font-semibold transition-all duration-300',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'overflow-hidden',
    fullWidth && 'w-full',
    glow && 'animate-pulse-glow'
  )
  
  // Variant-specific styles with improved gradients and hover effects
  const variantClasses = {
    primary: cn(
      'bg-gradient-to-r from-primary-500 to-primary-600',
      'text-white shadow-lg shadow-primary-500/25',
      'hover:from-primary-600 hover:to-primary-700',
      'hover:shadow-xl hover:shadow-primary-500/30',
      'focus-visible:ring-primary-500'
    ),
    secondary: cn(
      'glass backdrop-blur-md',
      'text-primary-700 border border-primary-200/50',
      'hover:bg-primary-50/50 hover:border-primary-300/50',
      'hover:shadow-lg',
      'focus-visible:ring-primary-300'
    ),
    gradient: cn(
      'bg-gradient-to-r from-primary-500 via-accent-500 to-ai-violet',
      'text-white shadow-xl shadow-accent-500/30',
      'hover:shadow-2xl hover:shadow-accent-500/40',
      'focus-visible:ring-accent-500',
      'animate-gradient-x'
    ),
    ai: cn(
      'glass-ai',
      'text-white font-medium',
      'hover:shadow-2xl hover:shadow-ai-purple/30',
      'focus-visible:ring-ai-purple',
      'border border-ai-purple/30',
      'bg-gradient-to-r from-ai-purple/20 via-ai-blue/20 to-ai-cyan/20',
      'animate-neural-flow'
    ),
    ghost: cn(
      'bg-transparent text-primary-600',
      'hover:bg-primary-50/50 hover:text-primary-700',
      'focus-visible:ring-primary-400'
    ),
    danger: cn(
      'bg-gradient-to-r from-error-500 to-red-600',
      'text-white shadow-lg shadow-error-500/25',
      'hover:from-red-600 hover:to-red-700',
      'hover:shadow-xl hover:shadow-error-500/30',
      'focus-visible:ring-error-500'
    ),
    success: cn(
      'bg-gradient-to-r from-success-500 to-green-600',
      'text-white shadow-lg shadow-success-500/25',
      'hover:from-green-600 hover:to-green-700',
      'hover:shadow-xl hover:shadow-success-500/30',
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

  // Loading spinner component with AI aesthetic
  const LoadingSpinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg 
        className="h-4 w-4" 
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
    </motion.div>
  )

  // Sparkle effect for AI buttons
  const SparkleEffect = () => (
    <AnimatePresence>
      {sparkle && isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute"
          >
            <Sparkles className="w-4 h-4 text-white/50" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Ripple effect on click
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 600)
    
    if (onClick) onClick(e)
  }

  return (
    <motion.button 
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      type={type}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 20, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Gradient overlay for AI variant */}
      {variant === 'ai' && (
        <motion.div
          className="absolute inset-0 opacity-0 bg-gradient-to-r from-ai-purple/30 via-ai-blue/30 to-ai-cyan/30"
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            <span>Processing...</span>
          </div>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <motion.span 
                className="flex-shrink-0"
                animate={isHovered ? { rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                {icon}
              </motion.span>
            )}
            <span>{children}</span>
            {icon && iconPosition === 'right' && (
              <motion.span 
                className="flex-shrink-0"
                animate={isHovered ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                {icon}
              </motion.span>
            )}
          </>
        )}
      </span>

      <SparkleEffect />
    </motion.button>
  )
})

export default Button