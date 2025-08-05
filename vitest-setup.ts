import { vi } from 'vitest';

// Set up environment variables immediately
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Mock window.alert
global.alert = vi.fn();

// Mock navigator.clipboard if not already defined
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(() => Promise.resolve()),
    },
    writable: true,
    configurable: true,
  });
}

// Mock window.open
global.open = vi.fn();