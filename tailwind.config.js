/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,html}", "./styles/**/*.css"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary lavender palette - Enhanced for AI-forward aesthetic
        primary: {
          DEFAULT: '#C3B1E1', // Default for bg-primary, text-primary, etc.
          50: '#f8f7ff',
          100: '#f0edff', 
          200: '#e4deff',
          300: '#d1c4ff',
          400: '#b8a2ff',
          500: '#C3B1E1', // Main primary color
          600: '#9d7bff',
          700: '#8b5cf6',
          800: '#7c3aed',
          900: '#6d28d9',
          950: '#4c1d95'
        },
        // Secondary accent colors - Deep purples for AI feel
        accent: {
          DEFAULT: '#8A2BE2', // Default for bg-accent, text-accent, etc.
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#8A2BE2', // Main accent color
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e'
        },
        // AI-inspired gradient colors
        ai: {
          purple: '#9333EA',
          blue: '#6366F1',
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          indigo: '#4F46E5'
        },
        // Soft complementary blues
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        // Neutral colors with dark mode support
        background: {
          DEFAULT: '#FEFEFE',
          dark: '#0F0F1A'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1A1A2E'
        },
        'text-primary': {
          DEFAULT: '#1F2937',
          dark: '#F9FAFB'
        },
        'text-secondary': {
          DEFAULT: '#6B7280',
          dark: '#D1D5DB'
        },
        'text-muted': {
          DEFAULT: '#9CA3AF',
          dark: '#9CA3AF'
        },
        // Status colors
        success: {
          DEFAULT: '#10B981',
          500: '#10B981'
        },
        warning: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B'
        },
        error: {
          DEFAULT: '#EF4444',
          500: '#EF4444'
        },
        info: {
          DEFAULT: '#3B82F6',
          500: '#3B82F6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'morph': 'morph 8s ease-in-out infinite',
        'ai-pulse': 'aiPulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'neural-flow': 'neuralFlow 3s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(195, 177, 225, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(195, 177, 225, 0.8), 0 0 60px rgba(138, 43, 226, 0.4)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(195, 177, 225, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(195, 177, 225, 0.8)' }
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' }
        },
        aiPulse: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        neuralFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' }
        },
        'gradient-y': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'center top' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'center bottom' }
        },
        'gradient-xy': {
          '0%, 100%': { 'background-size': '400% 400%', 'background-position': 'left center' },
          '25%': { 'background-size': '400% 400%', 'background-position': 'right center' },
          '50%': { 'background-size': '400% 400%', 'background-position': 'right bottom' },
          '75%': { 'background-size': '400% 400%', 'background-position': 'left bottom' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(195, 177, 225, 0.3)'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem'
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          'backdrop-filter': 'blur(16px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(195, 177, 225, 0.15)',
        },
        '.glass-dark': {
          background: 'rgba(26, 26, 46, 0.7)',
          'backdrop-filter': 'blur(16px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(138, 43, 226, 0.15)',
        },
        '.glass-ai': {
          background: 'linear-gradient(135deg, rgba(195, 177, 225, 0.1), rgba(138, 43, 226, 0.05))',
          'backdrop-filter': 'blur(20px) saturate(200%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(200%)',
          border: '1px solid rgba(195, 177, 225, 0.25)',
          boxShadow: '0 8px 32px 0 rgba(195, 177, 225, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        },
        '.gradient-primary': {
          background: 'linear-gradient(135deg, #C3B1E1 0%, #8A2BE2 100%)',
        },
        '.gradient-ai': {
          background: 'linear-gradient(135deg, #9333EA 0%, #6366F1 50%, #06B6D4 100%)',
          'background-size': '200% 200%',
          animation: 'neuralFlow 3s ease-in-out infinite',
        },
        '.gradient-surface': {
          background: 'linear-gradient(135deg, #FEFEFE 0%, #F8F7FF 100%)',
        },
        '.text-gradient': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          background: 'linear-gradient(135deg, #C3B1E1 0%, #8A2BE2 100%)',
        },
        '.text-gradient-ai': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          background: 'linear-gradient(135deg, #9333EA 0%, #6366F1 50%, #06B6D4 100%)',
        },
        '.transition-smooth': {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '2',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          '-webkit-box-orient': 'vertical',
          '-webkit-line-clamp': '3',
        }
      }
      addUtilities(newUtilities)
    }
  ]
};
