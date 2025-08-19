import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../core/api/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting your account...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors
        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Get the service from state (we'll parse it from the state token)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Session expired. Please log in again.');
        }

        // Determine the service from the state pattern stored in sessionStorage
        let service = '';
        ['instagram', 'twitter', 'facebook', 'gmail'].forEach(s => {
          const storedState = sessionStorage.getItem(`oauth-state-${s}`);
          if (storedState === state) {
            service = s;
            sessionStorage.removeItem(`oauth-state-${s}`);
          }
        });

        if (!service) {
          // Try to get service from the state in the database
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-connect?service=${searchParams.get('service') || ''}&action=callback`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                ['Content-Type']: 'application/json',
              },
              body: JSON.stringify({ code, state }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to complete OAuth flow');
          }

          await response.json();
          service = searchParams.get('service') || 'the service';
        } else {
          // Call the OAuth callback endpoint
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-connect?service=${service}&action=callback`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                ['Content-Type']: 'application/json',
              },
              body: JSON.stringify({ code, state }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to complete OAuth flow');
          }
        }

        setStatus('success');
        setMessage(`Successfully connected to ${service}!`);
        toast.success(`Connected to ${service} successfully!`);

        // Send message to parent window if opened as popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            service,
            success: true,
          }, window.location.origin);
          
          // Close the popup after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Redirect to profile page after 2 seconds
          setTimeout(() => {
            navigate('/profile?tab=connections');
          }, 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect account');
        toast.error(error.message || 'Failed to connect account');

        // Send error message to parent window if opened as popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-callback',
            success: false,
            error: error.message,
          }, window.location.origin);
          
          // Close the popup after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        } else {
          // Redirect to profile page after 3 seconds
          setTimeout(() => {
            navigate('/profile?tab=connections');
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connecting Account</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}