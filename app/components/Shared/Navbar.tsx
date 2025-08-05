import React, { useState, useEffect } from 'react'
import { LogOut, Menu, X, Home, DollarSign, Shield } from 'lucide-react'
import { supabase, getCurrentUser, signOut } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/admin'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Get initial user
    getCurrentUser().then(user => {
      setUser(user)
      if (user) {
        checkIsAdmin(user.id).then(setIsAdmin)
      }
    }).catch(() => setUser(null))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        checkIsAdmin(session.user.id).then(setIsAdmin)
      } else {
        setIsAdmin(false)
      }
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

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg group-hover:shadow-xl transition-shadow"></div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            iOwnMyFuture.ai
          </h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {user ? (
            <>
              <NavButton 
                onClick={() => navigate('/dashboard')}
                isActive={isActive('/dashboard')}
              >
                Dashboard
              </NavButton>
              <NavButton 
                onClick={() => navigate('/journal')}
                isActive={isActive('/journal') || location.pathname.startsWith('/journal/')}
              >
                Journal
              </NavButton>
              <NavButton 
                onClick={() => navigate('/moodboard')}
                isActive={isActive('/moodboard')}
              >
                Moodboard
              </NavButton>
              <NavButton 
                onClick={() => navigate('/insights')}
                isActive={isActive('/insights')}
              >
                Insights
              </NavButton>
              <NavButton 
                onClick={() => navigate('/profile')}
                isActive={isActive('/profile')}
              >
                Profile
              </NavButton>
              {isAdmin && (
                <NavButton 
                  onClick={() => navigate('/admin')}
                  isActive={isActive('/admin')}
                >
                  <Shield size={16} className="mr-1.5 inline" />
                  Admin
                </NavButton>
              )}
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <NavButton 
                onClick={() => navigate('/')}
                isActive={isActive('/')}
              >
                <Home size={18} className="mr-1" />
                Home
              </NavButton>
              <NavButton 
                onClick={() => navigate('/pricing')}
                isActive={isActive('/pricing')}
              >
                <DollarSign size={18} className="mr-1" />
                Pricing
              </NavButton>
              <button 
                onClick={() => navigate('/auth')}
                className="ml-4 px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Sign In
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} className="text-accent" /> : <Menu size={24} className="text-accent" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            {user ? (
              <div className="space-y-1">
                <MobileNavButton 
                  onClick={() => { navigate('/dashboard'); setIsMenuOpen(false) }}
                  isActive={isActive('/dashboard')}
                >
                  Dashboard
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/journal'); setIsMenuOpen(false) }}
                  isActive={isActive('/journal') || location.pathname.startsWith('/journal/')}
                >
                  Journal
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/moodboard'); setIsMenuOpen(false) }}
                  isActive={isActive('/moodboard')}
                >
                  Moodboard
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/insights'); setIsMenuOpen(false) }}
                  isActive={isActive('/insights')}
                >
                  Insights
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/profile'); setIsMenuOpen(false) }}
                  isActive={isActive('/profile')}
                >
                  Profile
                </MobileNavButton>
                {isAdmin && (
                  <MobileNavButton 
                    onClick={() => { navigate('/admin'); setIsMenuOpen(false) }}
                    isActive={isActive('/admin')}
                  >
                    <Shield size={16} className="mr-1.5 inline" />
                    Admin
                  </MobileNavButton>
                )}
                <div className="border-t border-primary/10 pt-3 mt-3">
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <MobileNavButton 
                  onClick={() => { navigate('/'); setIsMenuOpen(false) }}
                  isActive={isActive('/')}
                >
                  <Home size={18} className="mr-2" />
                  Home
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/pricing'); setIsMenuOpen(false) }}
                  isActive={isActive('/pricing')}
                >
                  <DollarSign size={18} className="mr-2" />
                  Pricing
                </MobileNavButton>
                <div className="pt-3">
                  <button 
                    onClick={() => { navigate('/auth'); setIsMenuOpen(false) }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-semibold"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

// Helper components for consistent styling
function NavButton({ children, onClick, isActive }: { children: React.ReactNode, onClick: () => void, isActive: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center px-4 py-2 rounded-full font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-accent shadow-sm' 
          : 'text-text-primary hover:text-accent hover:bg-primary/10'
      }`}
    >
      {children}
    </button>
  )
}

function MobileNavButton({ children, onClick, isActive }: { children: React.ReactNode, onClick: () => void, isActive: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-accent' 
          : 'text-text-primary hover:text-accent hover:bg-primary/10'
      }`}
    >
      {children}
    </button>
  )
}
