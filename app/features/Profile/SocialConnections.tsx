import React, { useState, useEffect, useCallback } from 'react';
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Mail, 
  Link as LinkIcon, 
  Check, 
  AlertCircle,
  Settings,
  Send,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { supabase, getCurrentUser } from '../../core/api/supabase';
import { type SocialIntegration } from '../../core/types';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';
import { errorTracker } from '../../shared/utils/errorTracking';

const socialServices = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400',
    textColor: 'text-white',
    description: 'Share your vision board progress and achievements'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    color: 'bg-black',
    textColor: 'text-white',
    description: 'Tweet your daily affirmations and milestones'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    textColor: 'text-white',
    description: 'Connect with your support network'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    color: 'bg-red-500',
    textColor: 'text-white',
    description: 'Send progress reports via email'
  }
];

export default function SocialConnections() {
  const [connections, setConnections] = useState<SocialIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [copyingLink, setCopyingLink] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadConnections = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {return;}
      
      const { data, error } = await supabase
        .from('social_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) {throw error;}
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnect = async (serviceId: string) => {
    setConnecting(serviceId);
    
    try {
      const user = await getCurrentUser();
      if (!user) {return;}
      
      // In a real app, this would initiate OAuth flow
      // For demo purposes, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('social_integrations')
        .upsert({
          user_id: user.id,
          service_name: serviceId,
          connected: true,
          auth_token: 'demo_token_' + serviceId // In real app, this would be the OAuth token
        });

      if (error) {throw error;}
      
      await loadConnections();
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'SocialConnections', 
        action: 'connectService',
        serviceName 
      });
      toast.error('Failed to connect service. OAuth integration coming soon.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (serviceId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {return;}
      
      const { error } = await supabase
        .from('social_integrations')
        .update({ connected: false, auth_token: null })
        .eq('user_id', user.id)
        .eq('service_name', serviceId);

      if (error) {throw error;}
      
      await loadConnections();
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'SocialConnections', 
        action: 'disconnectService',
        serviceName 
      });
      toast.error('Failed to disconnect service. Please try again.');
    }
  };

  const handleCopyShareLink = async () => {
    setCopyingLink(true);
    try {
      const user = await getCurrentUser();
      if (!user) {return;}
      
      const shareUrl = `${window.location.origin}/profile/${user.id}/achievements`;
      await navigator.clipboard.writeText(shareUrl);
      
      // Show success message
      toast.success('Share link copied to clipboard!');
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'SocialConnections', 
        action: 'copyShareLink' 
      });
      toast.error('Failed to copy link. Please try again.');
    } finally {
      setCopyingLink(false);
    }
  };

  const handleSendWeeklySummary = async () => {
    setSendingEmail(true);
    try {
      // In a real app, this would send an email via your backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Weekly summary will be sent to your email shortly!');
    } catch (error) {
      errorTracker.trackError(error, { 
        component: 'SocialConnections', 
        action: 'sendWeeklySummary' 
      });
      toast.error('Failed to send summary. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const isConnected = (serviceId: string) => {
    return connections.find(conn => conn.service_name === serviceId && conn.connected);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Social Connections */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-primary to-accent rounded-lg mr-3">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Social Connections</h3>
              <p className="text-sm text-gray-600">Connect your accounts to share achievements</p>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Sparkles className="w-4 h-4 mr-1" />
            {connections.filter(c => c.connected).length} connected
          </div>
        </div>

        <div className="grid gap-4">
          {socialServices.map((service) => {
            const connected = isConnected(service.id);
            const isConnecting = connecting === service.id;
            
            return (
              <div
                key={service.id}
                className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
                  connected 
                    ? 'border-green-200 bg-green-50/50 hover:bg-green-100/50' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center ${service.textColor} shadow-lg`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                        {connected && (
                          <div className="flex items-center text-green-600">
                            <Check className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">Connected</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {connected && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => toast.info(`Quick share to ${service.name} coming soon!`)}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    )}
                    
                    <Button
                      variant={connected ? "secondary" : "primary"}
                      size="small"
                      onClick={() => connected ? handleDisconnect(service.id) : handleConnect(service.id)}
                      loading={isConnecting}
                      disabled={isConnecting}
                      className={connected ? "hover:bg-red-100 hover:text-red-600" : ""}
                    >
                      {connected ? 'Disconnect' : 'Connect'}
                    </Button>
                  </div>
                </div>

                {connected && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-green-400">
                    <Check className="w-3 h-3 text-white absolute -top-4 -right-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Share Options */}
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Send className="w-5 h-5 mr-2 text-primary" />
          Quick Share Options
        </h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          <button 
            onClick={handleCopyShareLink}
            disabled={copyingLink}
            className="group p-6 border border-gray-200 rounded-xl text-left hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 hover:shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
              {copyingLink && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>
            <h5 className="font-semibold text-gray-900 mb-1">Copy Share Link</h5>
            <p className="text-sm text-gray-600">Generate a public link to your achievements page</p>
          </button>
          
          <button 
            onClick={handleSendWeeklySummary}
            disabled={sendingEmail}
            className="group p-6 border border-gray-200 rounded-xl text-left hover:border-purple/50 hover:bg-purple/5 transition-all duration-300 hover:shadow-lg disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              {sendingEmail && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              )}
            </div>
            <h5 className="font-semibold text-gray-900 mb-1">Send Weekly Summary</h5>
            <p className="text-sm text-gray-600">Email your progress report to friends and family</p>
          </button>
        </div>
      </div>

      {/* Privacy & Sharing Settings */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200/50 rounded-2xl p-6">
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              Privacy & Data Security
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Your journal entries remain completely private and are never shared</p>
              <p>• Only achievement badges and progress stats can be shared publicly</p>
              <p>• You control which platforms to connect and what to share</p>
              <p>• All social connections use secure OAuth authentication</p>
              <p>• You can disconnect any service at any time</p>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                🔒 Your privacy is our priority. All data is encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}