import { Github, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';

export interface SocialLink {
  name: string;
  url: string;
  icon: React.ElementType;
  enabled: boolean;
}

export const socialLinks: SocialLink[] = [
  {
    name: 'Twitter',
    url: 'https://twitter.com',
    icon: Twitter,
    enabled: false, // Set to true when you have a real Twitter account
  },
  {
    name: 'LinkedIn',
    url: 'https://linkedin.com',
    icon: Linkedin,
    enabled: false, // Set to true when you have a real LinkedIn page
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    icon: Github,
    enabled: false, // Set to true when you have a real GitHub repo to share
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com',
    icon: Instagram,
    enabled: false, // Set to true when you have a real Instagram account
  },
  {
    name: 'YouTube',
    url: 'https://youtube.com',
    icon: Youtube,
    enabled: false, // Set to true when you have a real YouTube channel
  },
];

// Get only enabled social links
export const getActiveSocialLinks = () => socialLinks.filter(link => link.enabled);