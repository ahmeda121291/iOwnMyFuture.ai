import React, { useState, useEffect } from 'react'
import { LogOut, Menu, X, Home, DollarSign, Shield, BookOpen, User as UserIcon, LayoutDashboard } from 'lucide-react'
import { supabase, getCurrentUser, signOut, getSession } from '../../core/api/supabase'
import { checkIsAdmin } from '../../core/api/admin'
import { useNavigate, useLocation } from 'react-router-dom'
import { type User } from '../../core/types'
import { errorTracker } from '../utils/errorTracking'
import toast from 'react-hot-toast'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Get initial user from Supabase auth context
    const initializeUser = async () => {
      try {
        const session = await getSession();
        if (session) {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
            const adminStatus = await checkIsAdmin(userData.id);
            setIsAdmin(adminStatus);
          }
        } else {
          // User is not authenticated (user == null)
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        errorTracker.trackError(error, { 
          component: 'Navbar', 
          action: 'initializeUser' 
        });
        // On error, treat as unauthenticated
        setUser(null);
        setIsAdmin(false);
      }
    };

    initializeUser();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          // User logged in
          const userData = await getCurrentUser();
          setUser(userData);
          if (userData) {
            const adminStatus = await checkIsAdmin(userData.id);
            setIsAdmin(adminStatus);
          }
        } else {
          // User logged out (user == null)
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        errorTracker.trackError(error, { 
          component: 'Navbar', 
          action: 'onAuthStateChange',
          event 
        });
        // On error, treat as unauthenticated
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      navigate('/')
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'Navbar', 
        action: 'handleSignOut' 
      })
      toast.error('Failed to sign out. Please try again.')
    }
  }

  const isActive = (path: string) => location.pathname === path
  const isLandingPage = location.pathname === '/'
  const showLogo = user || !isLandingPage // Show logo only when logged in or not on landing page

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - Only show when logged in or not on landing page */}
        {showLogo ? (
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate(user ? '/dashboard' : '/')}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 shadow-lg group-hover:shadow-xl transition-shadow flex items-center justify-center">
              <span className="text-white font-bold text-lg">iO</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              iOwnMyFuture<span className="text-accent-600">.ai</span>
            </h1>
          </div>
        ) : (
          <div /> // Empty div to maintain flex layout
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {user ? (
            // Authenticated user navigation
            <>
              <NavButton 
                onClick={() => navigate('/dashboard')}
                isActive={isActive('/dashboard')}
              >
                <LayoutDashboard size={18} className="mr-1.5" />
                Dashboard
              </NavButton>
              <NavButton 
                onClick={() => navigate('/journal')}
                isActive={isActive('/journal') || location.pathname.startsWith('/journal/')}
              >
                <BookOpen size={18} className="mr-1.5" />
                Journal
              </NavButton>
              <NavButton 
                onClick={() => navigate('/profile')}
                isActive={isActive('/profile')}
              >
                <UserIcon size={18} className="mr-1.5" />
                Profile
              </NavButton>
              {/* Additional navigation items for better UX */}
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
            // Public navigation (user == null)
            <>
              <NavButton 
                onClick={() => navigate('/')}
                isActive={isActive('/')}
              >
                <Home size={18} className="mr-1.5" />
                Home
              </NavButton>
              <NavButton 
                onClick={() => navigate('/pricing')}
                isActive={isActive('/pricing')}
              >
                <DollarSign size={18} className="mr-1.5" />
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
              // Authenticated user mobile navigation
              <div className="space-y-1">
                <MobileNavButton 
                  onClick={() => { navigate('/dashboard'); setIsMenuOpen(false) }}
                  isActive={isActive('/dashboard')}
                >
                  <LayoutDashboard size={18} className="mr-2" />
                  Dashboard
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/journal'); setIsMenuOpen(false) }}
                  isActive={isActive('/journal') || location.pathname.startsWith('/journal/')}
                >
                  <BookOpen size={18} className="mr-2" />
                  Journal
                </MobileNavButton>
                <MobileNavButton 
                  onClick={() => { navigate('/profile'); setIsMenuOpen(false) }}
                  isActive={isActive('/profile')}
                >
                  <UserIcon size={18} className="mr-2" />
                  Profile
                </MobileNavButton>
                {/* Additional navigation items for better UX */}
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
              // Public mobile navigation (user == null)
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
