import React, { useState } from 'react';
import { Check, Sparkles, Zap, Shield, Clock, Users, Crown, ArrowRight, Star, CheckCircle, Gift, Target, Brain, Rocket, Lock, HeadphonesIcon } from 'lucide-react';
import { products } from '../lib/stripeConfig';
import PricingCard from '../components/Pricing/PricingCard';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Filter products based on billing cycle
  const monthlyProduct = products.find(p => p.price === 18);
  const yearlyProduct = products.find(p => p.price === 180);

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-primary-600" />,
      title: "AI-Powered Vision Creation",
      description: "Advanced AI analyzes your goals and creates personalized visual representations that resonate with your subconscious mind.",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <Target className="w-6 h-6 text-accent-600" />,
      title: "Intelligent Goal Tracking",
      description: "Smart algorithms break down your dreams into actionable steps with real-time progress monitoring and adaptive recommendations.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: <Rocket className="w-6 h-6 text-green-600" />,
      title: "Accelerated Achievement",
      description: "Scientifically-proven visualization techniques combined with AI insights to help you achieve goals 3x faster than traditional methods.",
      gradient: "from-green-500 to-teal-600"
    },
    {
      icon: <Shield className="w-6 h-6 text-indigo-600" />,
      title: "Enterprise-Grade Security",
      description: "Military-grade encryption ensures your deepest aspirations and progress remain completely private and secure.",
      gradient: "from-indigo-500 to-blue-600"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Tech Entrepreneur",
      company: "Quantum AI",
      quote: "Achieved my dream of launching a $10M startup in 8 months. The AI vision boards kept me focused on what truly mattered.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Professional Athlete",
      company: "Olympic Training Center",
      quote: "Won gold at the Olympics after using this for 6 months. The goal tracking helped me optimize every aspect of my training.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
      rating: 5
    },
    {
      name: "Dr. Emily Watson",
      role: "Neuroscientist",
      company: "Stanford Research",
      quote: "From a scientific perspective, this tool leverages proven neuroplasticity principles. It literally rewires your brain for success.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-primary-100">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-primary-200 to-accent-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-accent-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          {/* Premium Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-white/40 backdrop-blur-sm border border-white/30 rounded-full text-sm font-medium text-gray-700 mb-8 hover:bg-white/50 transition-all duration-300">
            <Crown className="w-4 h-4 mr-2 text-accent-500" />
            Premium AI-Powered Transformation
            <Sparkles className="w-4 h-4 ml-2 text-primary-500" />
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-primary-600 to-accent-600 mb-6 leading-tight">
            Investment in Your
            <br />
            <span className="relative">
              Future Self
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full"></div>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Join the exclusive community of high-achievers who've transformed their lives with our AI-powered platform.
            <br />
            <span className="text-primary-600 font-medium">Your dreams deserve the best technology.</span>
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-16">
            <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/30">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-2 px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

          {/* Billing Toggle */}
                {/* Pricing Cards */}
      <section className="relative py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            
            {/* Free Tier */}
            <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/30 hover:bg-white/80 transition-all duration-300 group">
              <div className="text-center mb-8">
                <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-600 mb-4">
                  <Gift className="w-4 h-4 mr-2" />
                  Forever Free
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Explore</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-500 ml-1">/forever</span>
                </div>
                <p className="text-gray-600">Perfect for getting started with AI-powered goal setting</p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  "3 AI Vision Boards",
                  "Basic Goal Tracking",
                  "Weekly Progress Reports",
                  "Mobile Access",
                  "Community Support"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center group">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Pro Tier - Most Popular */}
            <div className="relative bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl p-8 text-white transform scale-105 shadow-2xl">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-white text-gray-900 px-6 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                  <Crown className="w-4 h-4 mr-2 text-accent-500" />
                  Most Popular
                </div>
              </div>

              <div className="text-center mb-8 mt-4">
                <h3 className="text-3xl font-bold mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-6xl font-bold">
                    ${billingCycle === 'yearly' ? '15' : '18'}
                  </span>
                  <span className="text-xl ml-1">
                    /{billingCycle === 'yearly' ? 'month' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 inline-block mb-4">
                    <span className="text-sm font-medium">Save $36/year • Billed annually</span>
                  </div>
                )}
                <p className="text-white/90">Everything you need to transform your life with AI</p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  "Unlimited AI Vision Boards",
                  "Advanced Goal Analytics", 
                  "Daily AI Insights",
                  "Smart Progress Tracking",
                  "Priority Support",
                  "Export & Sharing",
                  "Mobile & Desktop Apps",
                  "Custom AI Prompts",
                  "Achievement Celebrations"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                    <span className="text-white/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full bg-white text-primary-600 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors duration-300 flex items-center justify-center group shadow-lg">
                Start Pro Journey
                <Rocket className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-center mt-4 text-white/70 text-sm">
                30-day money-back guarantee
              </div>
            </div>

            {/* Enterprise Tier */}
            <div className="relative bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-white/30 hover:bg-white/80 transition-all duration-300 group">
              <div className="text-center mb-8">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-full text-sm font-medium mb-4">
                  <Shield className="w-4 h-4 mr-2" />
                  Enterprise
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Teams</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-500 ml-1">/user/month</span>
                </div>
                <p className="text-gray-600">Perfect for teams and organizations scaling success</p>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  "Everything in Pro",
                  "Team Collaboration",
                  "Admin Dashboard", 
                  "Advanced Security",
                  "Custom Integrations",
                  "Dedicated Support",
                  "Training & Onboarding",
                  "Custom Branding",
                  "API Access"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors duration-300 flex items-center justify-center group">
                Contact Sales
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Why Choose 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> Our Platform?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the most advanced AI-powered personal development platform ever created
            </p>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white p-8 rounded-3xl shadow-soft hover:shadow-soft-lg transition-all duration-500 hover:-translate-y-2 border border-gray-100"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} p-4 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-r from-primary-50 to-accent-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Trusted by
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> High Achievers</span>
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands who've transformed their lives with our platform
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-3xl p-8 shadow-soft hover:shadow-soft-lg transition-all duration-300">
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed italic">
                  "{testimonial.quote}"
                </blockquote>
                
                <div className="flex items-center">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-primary-600">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">Your data is protected with enterprise-grade encryption</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HeadphonesIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Get help whenever you need it from our expert team</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Money-Back Guarantee</h3>
              <p className="text-gray-600">Try risk-free with our 30-day money-back guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Quick Answers */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                q: "How is this different from other goal-setting apps?",
                a: "Our AI doesn't just track goals—it creates personalized visual representations that tap into your subconscious mind and provides real-time insights to accelerate achievement."
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. Cancel anytime with one click. No questions asked, no hidden fees. We even offer a 30-day money-back guarantee."
              },
              {
                q: "Is my data secure and private?",
                a: "Yes. We use bank-level encryption and never share your personal data. Your dreams and goals remain completely private."
              },
              {
                q: "Do you offer team/family plans?",
                a: "Yes! Our Enterprise plan is perfect for teams, families, or organizations wanting to achieve goals together."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-soft">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-primary-900 to-accent-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Your Transformation
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-accent-200"> Starts Now</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join over 50,000 high-achievers who've already transformed their lives with AI-powered goal achievement.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className="bg-white text-gray-900 hover:bg-gray-100 px-12 py-4 rounded-2xl text-lg font-bold shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all duration-300 flex items-center">
              Start Free Trial
              <Rocket className="w-5 h-5 ml-2" />
            </button>
            <button className="border-2 border-white/30 text-white hover:bg-white/10 px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300">
              Schedule Demo
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              30-day guarantee
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
