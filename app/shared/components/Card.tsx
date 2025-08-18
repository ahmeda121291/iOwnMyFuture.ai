import React from 'react'
import { motion, Variants } from 'framer-motion'
import { cn } from '../utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'ai' | 'gradient'
  hover?: boolean
  glow?: boolean
  animate?: boolean
  delay?: number
  onClick?: () => void
}

const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  }
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    children, 
    className = '', 
    variant = 'default',
    hover = true,
    glow = false,
    animate = true,
    delay = 0,
    onClick
  }, ref) => {
    const baseClasses = cn(
      'relative rounded-2xl p-6 transition-all duration-300',
      onClick && 'cursor-pointer',
      glow && 'animate-pulse-glow'
    )

    const variantClasses = {
      default: cn(
        'bg-white dark:bg-surface-dark',
        'border border-gray-200 dark:border-gray-700',
        'shadow-soft hover:shadow-soft-lg'
      ),
      glass: cn(
        'glass dark:glass-dark',
        'border border-white/20 dark:border-white/10',
        'shadow-glass',
        'hover:shadow-xl hover:shadow-primary-500/10'
      ),
      ai: cn(
        'glass-ai',
        'border border-ai-purple/30',
        'shadow-xl shadow-ai-purple/10',
        'hover:shadow-2xl hover:shadow-ai-purple/20',
        'bg-gradient-to-br from-ai-purple/5 via-ai-blue/5 to-ai-cyan/5'
      ),
      gradient: cn(
        'bg-gradient-to-br from-primary-50 via-accent-50 to-blue-50',
        'dark:from-primary-950/50 dark:via-accent-950/50 dark:to-blue-950/50',
        'border border-primary-200/50 dark:border-primary-700/50',
        'shadow-lg hover:shadow-xl'
      )
    }

    const cardClasses = cn(
      baseClasses,
      variantClasses[variant],
      className
    )

    const animationProps = animate ? {
      initial: "hidden",
      animate: "visible",
      whileHover: hover ? "hover" : undefined,
      variants: cardVariants,
      transition: { delay }
    } : {}

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cardClasses}
          onClick={onClick}
          {...animationProps}
        >
          {/* Animated gradient border for AI variant */}
          {variant === 'ai' && (
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-ai-purple via-ai-blue to-ai-cyan opacity-20"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
          )}
          
          {/* Glow effect */}
          {glow && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl -z-10" />
          )}
          
          <div className="relative z-10">
            {children}
          </div>
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={onClick}
      >
        {variant === 'ai' && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-ai-purple via-ai-blue to-ai-cyan opacity-20" />
        )}
        
        {glow && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 blur-xl -z-10" />
        )}
        
        <div className="relative z-10">
          {children}
        </div>
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card