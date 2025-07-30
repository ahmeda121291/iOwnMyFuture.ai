import React from 'react'
import { Heart, Twitter, Instagram, Linkedin, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="bg-gradient-to-r from-background to-primary/5 border-t border-primary/10 py-12 mt-16">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                iOwnMyFuture.ai
              </span>
            </div>
            <p className="text-text-secondary mb-6 leading-relaxed max-w-md">
              Empowering your journey to achieve your dreams through AI-powered vision boards, 
              mindful journaling, and personalized insights.
            </p>
            <div className="flex items-center space-x-4">
              <SocialButton 
                href="https://twitter.com/iownmyfuture" 
                icon={<Twitter size={20} />}
                label="Twitter"
              />
              <SocialButton 
                href="https://instagram.com/iownmyfuture" 
                icon={<Instagram size={20} />}
                label="Instagram"
              />
              <SocialButton 
                href="https://linkedin.com/company/iownmyfuture" 
                icon={<Linkedin size={20} />}
                label="LinkedIn"
              />
              <SocialButton 
                href="mailto:hello@iownmyfuture.ai" 
                icon={<Mail size={20} />}
                label="Email"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Links</h3>
            <div className="space-y-3">
              <FooterLink onClick={() => navigate('/')}>Home</FooterLink>
              <FooterLink onClick={() => navigate('/pricing')}>Pricing</FooterLink>
              <FooterLink onClick={() => navigate('/auth')}>Get Started</FooterLink>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Features</h3>
            <div className="space-y-3">
              <FooterLink onClick={() => navigate('/dashboard')}>Dashboard</FooterLink>
              <FooterLink onClick={() => navigate('/journal')}>AI Journal</FooterLink>
              <FooterLink onClick={() => navigate('/moodboard')}>Vision Boards</FooterLink>
              <FooterLink onClick={() => navigate('/insights')}>Analytics</FooterLink>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-text-secondary">
              <span>Made with</span>
              <Heart size={16} className="text-accent fill-current animate-pulse" />
              <span>for dreamers and achievers</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-text-secondary">
              <button 
                onClick={() => navigate('/privacy')}
                className="hover:text-accent transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => navigate('/terms')}
                className="hover:text-accent transition-colors"
              >
                Terms of Service
              </button>
              <span>© 2025 iOwnMyFuture.ai</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Helper Components
function SocialButton({ href, icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-accent hover:text-accent/80 transition-all duration-200 hover:scale-110"
      aria-label={label}
    >
      {icon}
    </a>
  )
}

function FooterLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="block text-text-secondary hover:text-accent transition-colors text-left"
    >
      {children}
    </button>
  )
}