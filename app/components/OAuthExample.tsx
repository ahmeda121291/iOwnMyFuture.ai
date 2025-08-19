import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithX, handleXOAuthCallback, postTweet } from '../services/oauth';

/**
 * Example component demonstrating OAuth integration
 * Shows how to use Google and X (Twitter) sign-in and post tweets
 */
export const OAuthExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tweetText, setTweetText] = useState('');
  const [message, setMessage] = useState('');

  // Check if we're returning from an X OAuth callback
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('code') && params.get('state')) {
        // This looks like an X OAuth callback
        setIsLoading(true);
        setMessage('Completing X authentication...');
        
        const { error } = await handleXOAuthCallback();
        
        if (error) {
          setMessage(`X authentication failed: ${error.message}`);
        } else {
          setMessage('X authentication successful! You can now post tweets.');
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setIsLoading(false);
      }
    };

    checkOAuthCallback();
  }, []);

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setMessage('Redirecting to Google...');
    
    const { error } = await signInWithGoogle();
    
    if (error) {
      setMessage(`Google sign-in failed: ${error.message}`);
      setIsLoading(false);
    }
    // If successful, user will be redirected to Google
  };

  // Handle X (Twitter) sign-in
  const handleXSignIn = async () => {
    setIsLoading(true);
    setMessage('Redirecting to X...');
    
    const { error } = await signInWithX();
    
    if (error) {
      setMessage(`X sign-in failed: ${error.message}`);
      setIsLoading(false);
    }
    // If successful, user will be redirected to X
  };

  // Handle posting a tweet
  const handlePostTweet = async () => {
    if (!tweetText.trim()) {
      setMessage('Please enter some text for your tweet');
      return;
    }

    setIsLoading(true);
    setMessage('Posting tweet...');
    
    const { error } = await postTweet(tweetText);
    
    if (error) {
      setMessage(`Failed to post tweet: ${error.message}`);
    } else {
      setMessage('Tweet posted successfully!');
      setTweetText('');
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">OAuth Integration Example</h2>
      
      {/* Status message */}
      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* OAuth Sign-in Buttons */}
      <div className="space-y-4 mb-8">
        <h3 className="text-lg font-semibold">Sign In With:</h3>
        
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <button
          onClick={handleXSignIn}
          disabled={isLoading}
          className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Sign in with X
        </button>
      </div>

      {/* Tweet Posting Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Post a Tweet:</h3>
        
        <textarea
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          placeholder="What's happening?"
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={4}
          maxLength={280}
          disabled={isLoading}
        />
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {tweetText.length}/280 characters
          </span>
          
          <button
            onClick={handlePostTweet}
            disabled={isLoading || !tweetText.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            Post Tweet
          </button>
        </div>
      </div>
    </div>
  );
};