import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Twitter, 
  Facebook, 
  Mail, 
  Link as LinkIcon, 
  Check, 
  AlertCircle,
  Settings 
} from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';
import Button from '../Shared/Button';

const socialServices = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    description: 'Share your vision board progress'
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    color: 'bg-black',
    description: 'Tweet your daily affirmations'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    description: 'Connect with your support network'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    color: 'bg-red-500',
    description: 'Send progress reports via email'
  }
];

export default function SocialConnections() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from('social_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (serviceId: string) => {
    setConnecting(serviceId);
    
    try {
      const user = await getCurrentUser();
      
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

      if (error) throw error;
      
      await loadConnections();
    } catch (error) {
      console.error('Error connecting service:', error);
      alert('Failed to connect service. In a production app, this would open OAuth flow.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (serviceId: string) => {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('social_integrations')
        .update({ connected: false, auth_token: null })
        .eq('user_id', user.id)
        .eq('service_name', serviceId);

      if (error) throw error;
      
      await loadConnections();
    } catch (error) {
      console.error('Error disconnecting service:', error);
      alert('Failed to disconnect service. Please try again.');
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
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Social Connections</h3>
        <Settings className="w-5 h-5 text-text-secondary" />
      </div>

      <div className="space-y-4">
        {socialServices.map((service) => {
          const connected = isConnected(service.id);
          const isConnecting = connecting === service.id;
          
          return (
            <div
              key={service.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-accent/30 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 ${service.color} rounded-lg flex items-center justify-center text-white`}>
                  <service.icon className="w-5 h-5" />
                </div>
                
                <div>
                  <h4 className="font-medium text-text-primary">{service.name}</h4>
                  <p className="text-sm text-text-secondary">{service.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {connected && (
                  <div className="flex items-center text-green-600 mr-2">
                    <Check className="w-4 h-4 mr-1" />
                    <span className="text-sm">Connected</span>
                  </div>
                )}
                
                <Button
                  variant={connected ? "secondary" : "primary"}
                  size="small"
                  onClick={() => connected ? handleDisconnect(service.id) : handleConnect(service.id)}
                  loading={isConnecting}
                  disabled={isConnecting}
                >
                  {connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">
              Enhanced Sharing Features
            </p>
            <p className="text-sm text-blue-600">
              Connect your social accounts to automatically share your achievements, 
              daily affirmations, and vision board progress with your network.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-text-primary mb-3">Quick Share Options</h4>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 border border-gray-200 rounded-lg text-left hover:border-accent/50 hover:bg-accent/5 transition-colors">
            <LinkIcon className="w-4 h-4 text-accent mb-1" />
            <p className="text-sm font-medium text-text-primary">Share Vision Board</p>
            <p className="text-xs text-text-secondary">Generate shareable link</p>
          </button>
          
          <button className="p-3 border border-gray-200 rounded-lg text-left hover:border-accent/50 hover:bg-accent/5 transition-colors">
            <Mail className="w-4 h-4 text-accent mb-1" />
            <p className="text-sm font-medium text-text-primary">Email Progress</p>
            <p className="text-xs text-text-secondary">Send weekly summary</p>
          </button>
        </div>
      </div>
    </div>
  );
}