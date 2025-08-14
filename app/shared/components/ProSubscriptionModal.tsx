import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Star, CheckCircle } from 'lucide-react';

interface ProSubscriptionModalProps {
  isOpen: boolean;
}

export default function ProSubscriptionModal({ isOpen }: ProSubscriptionModalProps) {
  const navigate = useNavigate();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl p-8 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Pro Subscription Required
          </h2>
          <p className="text-gray-600">
            Unlock the full power of MyFutureSelf with Pro
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Unlimited AI-powered journal entries</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Create and customize vision boards</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Advanced mood tracking & insights</span>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">Export and share your journey</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Starting at</p>
              <p className="text-2xl font-bold text-gray-900">
                $18<span className="text-base font-normal text-gray-600">/month</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Yearly discount available</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
          >
            <CreditCard className="h-5 w-5" />
            <span>Subscribe to Pro</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}