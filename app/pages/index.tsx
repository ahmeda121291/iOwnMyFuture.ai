import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  BookOpen, 
  Check, 
  ArrowRight,
  Brain,
  BarChart3,
  ChevronDown,
  Shield,
  Clock,
  PenTool,
  Target,
  Star,
  Quote,
  Award,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link as ScrollLink } from 'react-scroll';
import Button from '../shared/components/Button';
import { getCurrentUser, getSession } from '../core/api/supabase';
import { type User } from '../core/types';
import { errorTracker } from '../shared/utils/errorTracking';
import toast from 'react-hot-toast';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight: string;
}

interface HowItWorksStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  step: number;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [_isVisible, setIsVisible] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  useEffect(() => {
    setIsVisible(true);
    
    // Check authentication status using session
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (session) {
          const userData = await getCurrentUser();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        errorTracker.trackError(error, {
          component: 'LandingPage',
          action: 'checkAuth'
        });
        setUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    
    checkAuth();
    
    // Update page meta tags
    document.title = 'iOwnMyFuture.ai - Unlock Your Future with AI-Powered Vision Boards';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Transform your dreams into reality with AI-powered vision boards, smart journaling, and personalized insights. Start your journey to success today.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Transform your dreams into reality with AI-powered vision boards, smart journaling, and personalized insights. Start your journey to success today.';
      document.head.appendChild(meta);
    }
  }, []);

  // Smart CTA handler - routes based on auth status
  const handleStartJournaling = async () => {
    try {
      // Don't show toast while checking - just wait
      if (isAuthChecking) {
        return;
      }
      
      // Check current session state
      const session = await getSession();
      
      if (session && user) {
        // User is logged in - go to dashboard
        navigate('/dashboard');
      } else {
        // User is not logged in - redirect to auth
        navigate('/auth');
      }
    } catch (error) {
      errorTracker.trackError(error, {
        component: 'LandingPage',
        action: 'handleStartJournaling'
      });
      toast.error('Navigation failed. Please try again.');
    }
  };

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
  ];

  const howItWorksSteps: HowItWorksStep[] = [
    {
      icon: <PenTool className="w-10 h-10 text-primary-600" />,
      title: "Journal your thoughts",
      description: "Write freely about your day, dreams, and goals. Our AI understands context and emotion.",
      step: 1
    },
    {
      icon: <Brain className="w-10 h-10 text-accent-600" />,
      title: "Get instant AI insights",
      description: "Receive personalized summaries and discover patterns in your thoughts and behaviors.",
      step: 2
    },
    {
      icon: <Target className="w-10 h-10 text-purple-600" />,
      title: "Build your vision board",
      description: "Create stunning visual representations of your goals with AI-generated imagery.",
      step: 3
    }
  ];

  const testimonials: Testimonial[] = [
    {
      name: "Sarah Chen",
      role: "Entrepreneur & Life Coach",
      content: "This platform transformed how I approach goal-setting. The AI insights are incredibly accurate and the vision boards keep me motivated every single day.",
      rating: 5,
      avatar: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "Tech Executive",
      content: "I've tried dozens of productivity apps, but nothing comes close to this. The journaling feature alone has helped me gain clarity on my career path.",
      rating: 5,
      avatar: "MR"
    },
    {
      name: "Emma Thompson",
      role: "Creative Director",
      content: "The AI-powered vision boards are a game-changer. They help me visualize my creative projects in ways I never thought possible.",
      rating: 5,
      avatar: "ET"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Floating Badge */}
            <motion.div 
              className="inline-flex items-center px-6 py-2 bg-white/30 backdrop-blur-sm border border-white/20 rounded-full text-sm font-medium text-gray-800 mb-8 hover:bg-white/40 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 mr-2 text-accent-600" />
              Powered by Advanced AI Technology
              <ArrowRight className="w-4 h-4 ml-2" />
            </motion.div>

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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-16 px-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleStartJournaling}
                  disabled={isAuthChecking}
                  loading={isAuthChecking}
                  icon={<ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  fullWidth={false}
                  className="min-w-[250px]"
                >
                  {user ? 'Enter Dashboard' : 'Start Journaling Now'}
                </Button>
              </motion.div>
              
              <ScrollLink
                to="how-it-works"
                smooth={true}
                duration={500}
                offset={-80}
                className="w-full sm:w-auto"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={<ArrowRight className="w-5 h-5" />}
                    iconPosition="right"
                    className="min-w-[250px] cursor-pointer"
                  >
                    Learn How It Works
                  </Button>
                </motion.div>
              </ScrollLink>
            </div>

            {/* Scroll Indicator */}
            <ScrollLink
              to="how-it-works"
              smooth={true}
              duration={500}
              offset={-80}
            >
              <motion.button 
                className="animate-bounce hover:text-primary-700 transition-colors duration-300 text-gray-700 cursor-pointer"
                aria-label="Scroll to how it works"
                whileHover={{ scale: 1.1 }}
              >
                <ChevronDown className="w-8 h-8" />
              </motion.button>
            </ScrollLink>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="text-center mb-20"
          >
            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            >
              How It Works
            </motion.h2>
            <motion.p 
              variants={itemVariants}
              className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
            >
              Three simple steps to transform your life with AI-powered insights
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto"
          >
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="relative"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 flex justify-center">
                    <motion.div 
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {step.icon}
                    </motion.div>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>

                {/* Connector Line */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-primary-300 to-accent-300"></div>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* CTA after How It Works */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <Button
              variant="gradient"
              size="lg"
              onClick={handleStartJournaling}
              disabled={isAuthChecking}
              loading={isAuthChecking}
              icon={<ArrowRight className="w-5 h-5" />}
              iconPosition="right"
            >
              {user ? 'Continue Journaling' : 'Try It Free Today'}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="text-center mb-20"
          >
            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            >
              Beyond Traditional
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600"> Goal Setting</span>
            </motion.h2>
            <motion.p 
              variants={itemVariants}
              className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
            >
              Experience the next generation of personal development tools, designed for those who refuse to settle for ordinary.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid lg:grid-cols-3 gap-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="group relative bg-gradient-to-br from-[#F5F5FA] to-white p-8 rounded-3xl shadow-soft hover:shadow-soft-lg transition-all duration-500 border border-gray-100 backdrop-blur-sm"
              >
                {/* Feature Icon */}
                <div className="mb-8 flex justify-center">
                  <motion.div 
                    className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {feature.icon}
                  </motion.div>
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
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials & Trust Section */}
      <section id="testimonials" className="py-32 bg-gradient-to-r from-[#F5F5FA] to-[#E8E0F5]">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
            className="text-center mb-20"
          >
            <motion.h2 
              variants={itemVariants}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
            >
              Trusted by Thousands
            </motion.h2>
            <motion.p 
              variants={itemVariants}
              className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
            >
              Join the community of achievers transforming their lives every day
            </motion.p>
          </motion.div>

          {/* Testimonials Grid */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid lg:grid-cols-3 gap-8 mb-20"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-8 rounded-2xl shadow-lg"
              >
                <div className="flex items-center mb-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>

                {/* Quote */}
                <Quote className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-gray-700 leading-relaxed italic">
                  {testimonial.content}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Logos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm text-gray-600 mb-8 uppercase tracking-wider">As Featured In</p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale">
              {/* Placeholder logos */}
              <div className="flex items-center space-x-2">
                <Award className="w-8 h-8" />
                <span className="font-bold text-xl">TechCrunch</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-8 h-8" />
                <span className="font-bold text-xl">Forbes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8" />
                <span className="font-bold text-xl">Product Hunt</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="w-8 h-8" />
                <span className="font-bold text-xl">AI Weekly</span>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-8 mt-20"
          >
            <motion.div 
              variants={itemVariants}
              className="space-y-2 text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-primary-600">10,000+</div>
              <div className="text-gray-700 font-medium">Active Users</div>
            </motion.div>
            <motion.div 
              variants={itemVariants}
              className="space-y-2 text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-accent-600">95%</div>
              <div className="text-gray-700 font-medium">Goal Achievement Rate</div>
            </motion.div>
            <motion.div 
              variants={itemVariants}
              className="space-y-2 text-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-4xl font-bold text-purple-600">4.9/5</div>
              <div className="text-gray-700 font-medium">User Satisfaction</div>
            </motion.div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 text-center"
          >
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
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-gradient-to-br from-gray-900 via-primary-900 to-accent-900 text-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto px-6 text-center"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Your Future Starts
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-accent-200"> Today</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands who've already transformed their lives with AI-powered personal development.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleStartJournaling}
                disabled={isAuthChecking}
                loading={isAuthChecking}
                className="bg-white text-gray-900 hover:bg-gray-100 min-w-[280px]"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                {user ? 'Continue Your Journey' : 'Begin Your Transformation'}
              </Button>
            </motion.div>
            {!user && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    try {
                      navigate('/pricing');
                    } catch (error) {
                      errorTracker.trackError(error, {
                        component: 'LandingPage',
                        action: 'navigateToPricing'
                      });
                      toast.error('Navigation failed. Please try again.');
                    }
                  }}
                  disabled={isAuthChecking}
                  className="border-2 border-white/30 text-white hover:bg-white/10 min-w-[200px]"
                >
                  View Pricing
                </Button>
              </motion.div>
            )}
          </div>

          {!user && (
            <div className="mt-12 text-sm text-gray-400">
              No credit card required • 30-day money-back guarantee • Cancel anytime
            </div>
          )}
        </motion.div>
      </section>
    </main>
  );
}