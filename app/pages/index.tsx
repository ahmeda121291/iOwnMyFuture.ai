import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  BookOpen, 
  Check, 
  ArrowRight,
  Brain,
  BarChart3,
  Play,
  ChevronDown,
  Shield,
  Clock
} from 'lucide-react'
import Button from '../shared/components/Button'

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
    
    // Update page meta tags
    document.title = 'iOwnMyFuture.ai - Unlock Your Future with AI-Powered Vision Boards'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Transform your dreams into reality with AI-powered vision boards, smart journaling, and personalized insights. Start your journey to success today.')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'Transform your dreams into reality with AI-powered vision boards, smart journaling, and personalized insights. Start your journey to success today.'
      document.head.appendChild(meta)
    }
  }, [])

  const features: Feature[] = [
    {
      icon: <Brain className="w-8 h-8 text-primary-600" />,
      title: "AI-Powered Vision Boards",
      description: "Transform your dreams into vivid, actionable vision boards using cutting-edge AI that understands your deepest aspirations.",
      highlight: "Revolutionary AI Technology"
    },
    {
      icon: <BookOpen className="w-8 h-8 text-accent-600" />,
      title: "Smart Journaling",
      description: "Every thought becomes insight. Our AI analyzes your entries, creating personalized summaries that reveal patterns you never knew existed.",
      highlight: "Deep Learning Insights"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-600" />,
      title: "Progress Insights",
      description: "Watch your future unfold through data. Advanced analytics show where you've been and predict where you're going.",
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
    <main className="min-h-screen bg-gradient-to-br from-[#F5F5FA] to-[#C3B1E1]">
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
            <div className="inline-flex items-center px-6 py-2 bg-white/30 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium text-gray-800 mb-8 hover:bg-white/40 transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2 text-accent-600" />
              Powered by Advanced AI Technology
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>

         <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-transparent leading-tight">
  <span className="bg-clip-text bg-gradient-to-r from-gray-900 via-primary-600 to-accent-600">
    Unlock Your
  </span>
  <br />
  <span className="relative bg-clip-text bg-gradient-to-r from-gray-900 via-primary-600 to-accent-600">
    Future
    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full transform scale-x-0 animate-[scaleX_1s_ease-out_0.5s_forwards] origin-left"></div>
  </span>
</h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              Transform dreams into reality with AI-powered journaling and vision boards.
              <br />
              <span className="text-primary-700 font-medium">The future of personal growth is here.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Button
                onClick={() => navigate('/auth')}
                className="group relative overflow-hidden bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-2xl hover:shadow-accent-500/25 transform hover:scale-105 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-accent-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Button>
              
              <Button
                onClick={() => window.open('#demo', '_blank')}
                className="group flex items-center px-8 py-4 bg-white/60 backdrop-blur-sm hover:bg-white/80 text-gray-800 rounded-full text-lg font-semibold border border-white/40 hover:border-white/60 transition-all duration-300"
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
              className="animate-bounce hover:text-primary-700 transition-colors duration-300 text-gray-700"
              aria-label="Scroll to features"
            >
              <ChevronDown className="w-8 h-8" />
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
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Experience the next generation of personal development tools, designed for those who refuse to settle for ordinary.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-[#F5F5FA] to-white p-8 rounded-3xl shadow-soft hover:shadow-soft-lg transition-all duration-500 hover:-translate-y-2 border border-gray-100 backdrop-blur-sm"
              >
                {/* Feature Icon */}
                <div className="mb-8 flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                </div>

                {/* Feature Badge */}
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-primary-100 to-accent-100 text-primary-800 text-sm font-medium rounded-full mb-4">
                  {feature.highlight}
                </div>

                {/* Feature Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-gradient-to-r from-[#F5F5FA] to-[#E8E0F5]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Trusted by Future Leaders</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2 text-center">
              <div className="text-4xl font-bold text-primary-600">10,000+</div>
              <div className="text-gray-700 font-medium">Dreams Transformed</div>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-4xl font-bold text-accent-600">95%</div>
              <div className="text-gray-700 font-medium">Goal Achievement Rate</div>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-4xl font-bold text-purple-600">4.9/5</div>
              <div className="text-gray-700 font-medium">User Satisfaction</div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center space-x-3 text-gray-700">
              <Shield className="w-6 h-6 text-green-600" />
              <span className="font-medium">Enterprise-grade security & privacy</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-700">
              <Clock className="w-6 h-6 text-blue-600" />
              <span className="font-medium">30-day money-back guarantee</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-700">
              <Check className="w-6 h-6 text-primary-600" />
              <span className="font-medium">Ethical AI development</span>
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
    </main>
  );
}
