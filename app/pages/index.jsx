import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Target, BookOpen, TrendingUp, Star, Zap, Check, Crown } from 'lucide-react'
import Button from '../components/Shared/Button'

export default function LandingPage() {
  const navigate = useNavigate()

  const features = [
    {
      icon: <Target className="w-8 h-8 text-accent" />,
      title: "AI-Powered Vision Boards",
      description: "Create dynamic, personalized vision boards that evolve with your goals using advanced AI technology."
    },
    {
      icon: <BookOpen className="w-8 h-8 text-accent" />,
      title: "Smart Journaling",
      description: "Transform your thoughts into insights with AI-powered journal summaries and progress tracking."
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-accent" />,
      title: "Progress Analytics",
      description: "Visualize your growth journey with detailed analytics and personalized achievement insights."
    }
  ]

  const pricingTiers = [
    {
      name: "Monthly",
      price: "$18",
      period: "/month",
      features: [
        "Unlimited AI Vision Boards",
        "Smart Journal Summaries", 
        "Progress Analytics",
        "Goal Tracking",
        "Cloud Sync",
        "24/7 Support"
      ],
      cta: "Start Monthly",
      popular: false
    },
    {
      name: "Yearly",
      price: "$180", 
      period: "/year",
      features: [
        "Everything in Monthly",
        "2 Months Free",
        "Priority AI Processing",
        "Advanced Analytics",
        "Export Features",
        "Premium Support"
      ],
      cta: "Choose Yearly",
      popular: true
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-secondary pt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6" style={{ fontSize: '48px', lineHeight: '1.1' }}>
              Transform Your Dreams Into
              <span className="text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text"> Reality</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto" style={{ fontSize: '20px' }}>
              Harness the power of AI to create dynamic vision boards and intelligent journaling 
              that guides you toward achieving your most ambitious goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="large"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-4 rounded-full shadow-md hover:scale-105 transition-all duration-300"
                style={{ backgroundColor: '#8A2BE2' }}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button 
                variant="secondary"
                size="large"
                onClick={() => navigate('/pricing')}
                className="text-lg px-8 py-4 rounded-full shadow-md hover:scale-105 transition-all duration-300"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Powerful Features for Your Success
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Everything you need to visualize, track, and achieve your goals with the power of artificial intelligence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="glass p-8 rounded-lg shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 mx-auto">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3 text-center">
                  {feature.title}
                </h3>
                <p className="text-text-secondary text-center">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-text-secondary">
              Choose the perfect plan to start your transformation journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div 
                key={index} 
                className={`card relative ${tier.popular ? 'ring-2 ring-accent transform scale-105' : ''} hover:shadow-xl transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{tier.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-accent">{tier.price}</span>
                    <span className="text-text-secondary ml-1">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate('/pricing')}
                  className="w-full rounded-full shadow-md hover:scale-105 transition-all duration-300"
                  variant={tier.popular ? 'primary' : 'secondary'}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Life?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of achievers who've already started their journey with iOwnMyFuture.ai
          </p>
          <Button 
            variant="secondary"
            size="large"
            onClick={() => navigate('/auth')}
            className="bg-white text-accent hover:bg-gray-100 text-lg px-8 py-4 rounded-full shadow-md hover:scale-105 transition-all duration-300"
          >
            <Zap className="w-5 h-5 mr-2" />
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  )
}