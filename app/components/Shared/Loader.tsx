import React from 'react'

interface LoaderProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Loader({ size = 'medium', className = '' }: LoaderProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full border-2 border-primary border-t-transparent rounded-full spinner"></div>
    </div>
  )
}
