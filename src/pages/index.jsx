import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Target, BookOpen, TrendingUp, Star, Zap } from 'lucide-react'
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

  const testimonials = [
    {
      name: "Sarah Mitchell",
      text: "MoodBoard.ai helped me visualize and achieve my career goals faster than I ever imagined.",
      rating: 5
    },
    {
      name: "David Chen",
      text: "The AI insights from my journal entries have been incredibly eye-opening. Life-changing app!",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      text: "Finally, a tool that combines my love for journaling with goal achievement. Absolutely perfect.",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/10 pt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
              Transform Your Dreams Into
              <span className="text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text"> Reality</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Harness the power of AI to create dynamic vision boards and intelligent journaling 
              that guides you toward achieving your most ambitious goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="large"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-4"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Your Journey
              </Button>
              <Button 
                variant="secondary"
                size="large"
                onClick={() => navigate('/pricing')}
                className="text-lg px-8 py-4"
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
              <div key={index} className="card hover:scale-105">
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

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Simple Steps to Success
            </h2>
            <p className="text-xl text-text-secondary">
              Your journey to achievement starts here
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Set Your Goals</h3>
                <p className="text-text-secondary">Define your dreams and aspirations with our guided goal-setting process.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Create & Journal</h3>
                <p className="text-text-secondary">Build your AI-powered vision board and maintain a daily journaling practice.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Track & Achieve</h3>
                <p className="text-text-secondary">Monitor your progress with AI insights and celebrate your achievements.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Loved by Dreamers Worldwide
            </h2>
            <p className="text-xl text-text-secondary">
              See what our community is saying about their transformation journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-text-secondary mb-4 italic">
                  "{testimonial.text}"
                </p>
                <p className="font-semibold text-text-primary">
                  {testimonial.name}
                </p>
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
            Join thousands of achievers who've already started their journey with MoodBoard.ai
          </p>
          <Button 
            variant="secondary"
            size="large"
            onClick={() => navigate('/auth')}
            className="bg-white text-accent hover:bg-gray-100 text-lg px-8 py-4"
          >
            <Zap className="w-5 h-5 mr-2" />
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  )
}