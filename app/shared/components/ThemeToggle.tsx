import React from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Sparkles } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { cn } from '../utils/cn'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  variant?: 'default' | 'ai'
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false,
  variant = 'ai'
}) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const springConfig = {
    type: "spring",
    stiffness: 700,
    damping: 30
  }

  if (variant === 'ai') {
    return (
      <motion.button
        onClick={toggleTheme}
        className={cn(
          "relative group",
          "w-16 h-8 p-1",
          "glass-ai rounded-full",
          "border border-ai-purple/30",
          "shadow-lg shadow-ai-purple/10",
          "hover:shadow-xl hover:shadow-ai-purple/20",
          "transition-all duration-300",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ai-purple focus-visible:ring-offset-2",
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-30"
          animate={{
            background: isDark 
              ? 'linear-gradient(135deg, #1e3a8a 0%, #6d28d9 100%)'
              : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Toggle switch */}
        <motion.div
          className={cn(
            "relative z-10 w-6 h-6 rounded-full",
            "bg-white dark:bg-gray-900",
            "shadow-lg",
            "flex items-center justify-center"
          )}
          layout
          transition={springConfig}
          animate={{
            x: isDark ? 32 : 0,
          }}
        >
          <motion.div
            initial={false}
            animate={{
              scale: isDark ? 0 : 1,
              opacity: isDark ? 0 : 1,
              rotate: isDark ? 180 : 0
            }}
            transition={{ duration: 0.3 }}
            className="absolute"
          >
            <Sun className="w-4 h-4 text-yellow-500" />
          </motion.div>
          <motion.div
            initial={false}
            animate={{
              scale: isDark ? 1 : 0,
              opacity: isDark ? 1 : 0,
              rotate: isDark ? 0 : -180
            }}
            transition={{ duration: 0.3 }}
            className="absolute"
          >
            <Moon className="w-4 h-4 text-blue-500" />
          </motion.div>
        </motion.div>

        {/* Sparkle effects */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={false}
          animate={isDark ? {} : { rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="absolute top-0 right-1 w-3 h-3 text-yellow-400/50" />
          <Sparkles className="absolute bottom-0 left-1 w-3 h-3 text-blue-400/50" />
        </motion.div>

        {/* Label */}
        {showLabel && (
          <motion.span 
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </motion.span>
        )}
      </motion.button>
    )
  }

  // Default variant (simpler)
  return (
    <motion.button
      onClick={toggleTheme}
      className={cn(
        "relative",
        "w-14 h-7 p-0.5",
        "bg-gray-200 dark:bg-gray-700 rounded-full",
        "transition-colors duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <motion.div
        className={cn(
          "w-6 h-6 rounded-full",
          "bg-white dark:bg-gray-900",
          "shadow-md",
          "flex items-center justify-center"
        )}
        layout
        transition={springConfig}
        animate={{
          x: isDark ? 26 : 0,
        }}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-blue-500" />
        ) : (
          <Sun className="w-4 h-4 text-yellow-500" />
        )}
      </motion.div>
    </motion.button>
  )
}

export default ThemeToggle