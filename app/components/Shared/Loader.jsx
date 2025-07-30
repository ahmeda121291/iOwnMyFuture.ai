import React from 'react'

export default function Loader({ size = 'medium', className = '' }) {
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