import React, { useState, useEffect } from 'react'
import { User, LogOut, Menu, X } from 'lucide-react'
import { supabase, getCurrentUser, signOut } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(setUser).catch(() => setUser(null))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass" style={{ padding: 'var(--spacing)' }}>
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent"></div>
          <h1 className="text-xl font-bold text-primary">MoodBoard.ai</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          {user ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-text-primary hover:text-accent transition-colors"
              >
                Dashboard
              </button>
              <button 
                onClick={() => navigate('/journal')}
                className="text-text-primary hover:text-accent transition-colors"
              >
                Journal
              </button>
              <button 
                onClick={() => navigate('/moodboard')}
                className="text-text-primary hover:text-accent transition-colors"
              >
                Vision Board
              </button>
              <button 
                onClick={() => navigate('/insights')}
                className="text-text-primary hover:text-accent transition-colors"
              >
                Insights
              </button>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => navigate('/profile')}
                  className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                >
                  <User size={20} className="text-accent" />
                </button>
                <button 
                  onClick={handleSignOut}
                  className="p-2 rounded-full hover:bg-red-100 transition-colors"
                >
                  <LogOut size={20} className="text-red-500" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/pricing')}
                className="text-text-primary hover:text-accent transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => navigate('/auth')}
                className="btn btn-secondary"
              >
                Sign In
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 p-4 glass-lavender rounded-lg">
          {user ? (
            <div className="space-y-3">
              <button 
                onClick={() => { navigate('/dashboard'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { navigate('/journal'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Journal
              </button>
              <button 
                onClick={() => { navigate('/moodboard'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Vision Board
              </button>
              <button 
                onClick={() => { navigate('/insights'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Insights
              </button>
              <hr className="border-primary/20" />
              <button 
                onClick={() => { navigate('/profile'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Profile
              </button>
              <button 
                onClick={handleSignOut}
                className="block w-full text-left text-red-500 hover:text-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={() => { navigate('/pricing'); setIsMenuOpen(false) }}
                className="block w-full text-left text-text-primary hover:text-accent transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => { navigate('/auth'); setIsMenuOpen(false) }}
                className="btn btn-secondary w-full"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}