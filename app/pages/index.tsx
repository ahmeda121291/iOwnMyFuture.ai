import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  Target, 
  BookOpen, 
  TrendingUp, 
  Star, 
  Zap, 
  Check, 
  Crown,
  ArrowRight,
  Brain,
  Eye,
  BarChart3,
  Compass,
  Play,
  ChevronDown
} from 'lucide-react'
import Button from '../components/Shared/Button'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  highlight: string
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState<boolean>(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features: Feature[] = [
    {
      icon: (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-lg opacity-30"></div>
          <div className="relative p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
      ),
      title: "AI-Powered Vision Creation",
      description: "Transform abstract dreams into vivid, actionable vision boards using cutting-edge artificial intelligence that understands your deepest aspirations.",
      highlight: "Revolutionary AI Technology"
    },
    {
      icon: (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur-lg opacity-30"></div>
          <div className="relative p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl">
            <Eye className="w-8 h-8 text-white" />
          </div>
        </div>
      ),
      title: "Intelligent Journaling",
      description: "Every thought becomes insight. Our AI doesn't just store your words—it understands them, creating personalized summaries that reveal patterns you never knew existed.",
      highlight: "Deep Learning Insights"
    },
    {
      icon: (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-lg opacity-30"></div>
          <div className="relative p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
        </div>
      ),
      title: "Predictive Analytics",
      description: "Watch your future unfold through data. Advanced analytics don't just show where you've been—they predict where you're going and how to get there faster.",
      highlight: "Future-Forward Tracking"
    }
  ]

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-primary-100">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-primary-200 to-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-accent-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-32 left-20 w-72 h-72 bg-gradient-to-r from-blue-200 to-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Floating Badge */}
            <div className="inline-flex items-center px-6 py-2 bg-white/30 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium text-gray-700 mb-8 hover:bg-white/40 transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2 text-accent-500" />
              Powered by Advanced AI Technology
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-primary-600 to-accent-600 mb-6 leading-tight">
              Own Your
              <br />
              <span className="relative">
                Future
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full transform scale-x-0 animate-[scaleX_1s_ease-out_0.5s_forwards] origin-left"></div>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              Transform dreams into reality with AI that understands your deepest aspirations.
              <br />
              <span className="text-primary-600 font-medium">The future of personal growth is here.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Button
                onClick={() => navigate('/auth')}
                className="group relative overflow-hidden bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-2xl hover:shadow-accent-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
              
              <Button
                onClick={() => window.open('#demo', '_blank')}
                className="group flex items-center px-8 py-4 bg-white/50 backdrop-blur-sm hover:bg-white/70 text-gray-700 rounded-full text-lg font-semibold border border-white/30 hover:border-white/50 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-3 group-hover:bg-primary-50 transition-colors">
                  <Play className="w-6 h-6 text-primary-600 ml-1" />
                </div>
                Watch Demo
              </Button>
            </div>

            {/* Scroll Indicator */}
            <button 
              onClick={scrollToFeatures}
              className="animate-bounce hover:text-primary-600 transition-colors duration-300"
              aria-label="Scroll to features"
            >
              <ChevronDown className="w-8 h-8 text-gray-400" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Beyond Traditional
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> Goal Setting</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Experience the next generation of personal development tools, designed for those who refuse to settle for ordinary.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white p-8 rounded-3xl shadow-soft hover:shadow-soft-lg transition-all duration-500 hover:-translate-y-2 border border-gray-100"
              >
                {/* Feature Icon */}
                <div className="mb-8 flex justify-center">
                  {feature.icon}
                </div>

                {/* Feature Badge */}
                <div className="inline-block px-3 py-1 bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 text-sm font-medium rounded-full mb-4">
                  {feature.highlight}
                </div>

                {/* Feature Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-r from-primary-50 to-accent-50">
        <div className="container mx-auto px-6 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary-600">10,000+</div>
              <div className="text-gray-600">Dreams Transformed</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-accent-600">95%</div>
              <div className="text-gray-600">Goal Achievement Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-purple-600">4.9/5</div>
              <div className="text-gray-600">User Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-primary-900 to-accent-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Your Future Starts
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-accent-200"> Today</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands who've already transformed their lives with AI-powered personal development.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-white text-gray-900 hover:bg-gray-100 px-12 py-4 rounded-full text-lg font-semibold shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all duration-300"
            >
              Begin Your Transformation
            </Button>
            <Button
              onClick={() => navigate('/pricing')}
              className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-4 rounded-full text-lg font-semibold transition-all duration-300"
            >
              View Pricing
            </Button>
          </div>

          <div className="mt-12 text-sm text-gray-400">
            No credit card required • 30-day money-back guarantee • Cancel anytime
          </div>
        </div>
      </section>
    </div>
  );
}
