import React, { useState, useEffect } from 'react'
import { LogOut, Menu, X, Home, DollarSign, Shield, BookOpen, User as UserIcon, LayoutDashboard, Target, TrendingUp, Sparkles } from 'lucide-react'
import { supabase, getCurrentUser, signOut, getSession } from '../../core/api/supabase'
import { checkIsAdmin } from '../../core/api/admin'
import { useNavigate, useLocation } from 'react-router-dom'
import { type User } from '../../core/types'
import { errorTracker } from '../utils/errorTracking'
import toast from 'react-hot-toast'

// ============= Public Navigation Component =============
function PublicNav({ 
  isMenuOpen, 
  setIsMenuOpen, 
  isActive, 
  navigate 
}: {
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  isActive: (path: string) => boolean
  navigate: (path: string) => void
}) {
  return (
    <>
      {/* Desktop Public Navigation */}
      <div className="hidden md:flex items-center space-x-1">
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
          className="ml-4 px-5 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-600 transition-all duration-200"
        >
          Get Started
        </button>
        <button 
          onClick={() => navigate('/auth')}
          className="px-5 py-2 border border-primary text-primary rounded-full font-medium hover:bg-primary/10 transition-all duration-200"
        >
          Sign In
        </button>
      </div>

      {/* Mobile Public Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-lg">
          <div className="container mx-auto px-4 py-4">
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
              <div className="pt-3 space-y-2">
                <button 
                  onClick={() => { navigate('/auth'); setIsMenuOpen(false) }}
                  className="w-full px-6 py-3 bg-primary text-white rounded-full font-medium"
                >
                  Get Started
                </button>
                <button 
                  onClick={() => { navigate('/auth'); setIsMenuOpen(false) }}
                  className="w-full px-6 py-3 border border-primary text-primary rounded-full font-medium"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============= Private Navigation Component =============
function PrivateNav({ 
  isMenuOpen, 
  setIsMenuOpen, 
  isActive, 
  navigate,
  handleSignOut,
  isAdmin,
  location
}: {
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  isActive: (path: string) => boolean
  navigate: (path: string) => void
  handleSignOut: () => void
  isAdmin: boolean
  location: any
}) {
  return (
    <>
      {/* Desktop Private Navigation */}
      <div className="hidden md:flex items-center space-x-1">
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
          onClick={() => navigate('/moodboard')}
          isActive={isActive('/moodboard')}
        >
          <Target size={18} className="mr-1.5" />
          Vision Board
        </NavButton>
        <NavButton 
          onClick={() => navigate('/insights')}
          isActive={isActive('/insights')}
        >
          <TrendingUp size={18} className="mr-1.5" />
          Insights
        </NavButton>
        <NavButton 
          onClick={() => navigate('/profile')}
          isActive={isActive('/profile')}
        >
          <UserIcon size={18} className="mr-1.5" />
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
      </div>

      {/* Mobile Private Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-lg">
          <div className="container mx-auto px-4 py-4">
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
                onClick={() => { navigate('/moodboard'); setIsMenuOpen(false) }}
                isActive={isActive('/moodboard')}
              >
                <Target size={18} className="mr-2" />
                Vision Board
              </MobileNavButton>
              <MobileNavButton 
                onClick={() => { navigate('/insights'); setIsMenuOpen(false) }}
                isActive={isActive('/insights')}
              >
                <TrendingUp size={18} className="mr-2" />
                Insights
              </MobileNavButton>
              <MobileNavButton 
                onClick={() => { navigate('/profile'); setIsMenuOpen(false) }}
                isActive={isActive('/profile')}
              >
                <UserIcon size={18} className="mr-2" />
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
          </div>
        </div>
      )}
    </>
  )
}

// ============= Main Navbar Component =============
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
            const adminStatus = await checkIsAdmin();
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
            const adminStatus = await checkIsAdmin();
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
  
  // Determine if we should show logo
  // Show logo when: not on landing page
  const showLogo = !isLandingPage

  // SPECIAL CASE: Logged in user on landing page - show minimal nav
  if (user && isLandingPage) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* No logo on landing page */}
          <div />
          
          {/* Simple enter dashboard and sign out buttons */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-semibold shadow-md hover:shadow-xl hover:scale-105 transform transition-all duration-200"
            >
              Enter Dashboard
            </button>
            <button 
              onClick={handleSignOut}
              className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-full font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile: Same simple buttons */}
          {isMenuOpen && (
            <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-lg">
              <div className="container mx-auto px-4 py-4 space-y-2">
                <button 
                  onClick={() => { navigate('/dashboard'); setIsMenuOpen(false) }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-semibold shadow-md"
                >
                  Enter Dashboard
                </button>
                <button 
                  onClick={() => { handleSignOut(); setIsMenuOpen(false) }}
                  className="w-full px-6 py-3 text-red-600 hover:bg-red-50 rounded-full font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} className="text-accent" /> : <Menu size={24} className="text-accent" />}
          </button>
        </div>
      </nav>
    )
  }

  // Clean conditional rendering based on user state
  if (user === null) {
    // PUBLIC NAVIGATION (Not logged in)
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo - Only show when not on landing page */}
          {showLogo ? (
            <div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 shadow-lg group-hover:shadow-xl transition-shadow flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                MyFutureSelf<span className="text-accent-600">.ai</span>
              </h1>
            </div>
          ) : (
            <div /> // Empty div to maintain flex layout on landing page
          )}

          <PublicNav 
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            isActive={isActive}
            navigate={navigate}
          />

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} className="text-accent" /> : <Menu size={24} className="text-accent" />}
          </button>
        </div>
      </nav>
    )
  }

  // PRIVATE NAVIGATION (Logged in and NOT on landing page)
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - Always show when logged in and not on landing page */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-600 to-accent-600 shadow-lg group-hover:shadow-xl transition-shadow flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            MyFutureSelf<span className="text-accent-600">.ai</span>
          </h1>
        </div>

        <PrivateNav 
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          isActive={isActive}
          navigate={navigate}
          handleSignOut={handleSignOut}
          isAdmin={isAdmin}
          location={location}
        />

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} className="text-accent" /> : <Menu size={24} className="text-accent" />}
        </button>
      </div>
    </nav>
  )
}

// ============= Helper Components =============
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