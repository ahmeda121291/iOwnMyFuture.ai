import React from 'react'
import { Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-primary/20 py-8 mt-12">
      <div className="container mx-auto px-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent"></div>
          <span className="text-lg font-semibold text-primary">MoodBoard.ai</span>
        </div>
        
        <p className="text-text-secondary mb-4">
          Empowering your journey to achieve your dreams through AI-powered vision boards and mindful journaling.
        </p>
        
        <div className="flex items-center justify-center space-x-1 text-text-secondary">
          <span>Made with</span>
          <Heart size={16} className="text-accent fill-current" />
          <span>for dreamers and achievers</span>
        </div>
        
        <div className="mt-4 pt-4 border-t border-primary/10">
          <p className="text-sm text-text-secondary">
            © 2024 MoodBoard.ai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}