import { supabase } from '../core/api/supabase';
import { errorTracker } from '../shared/utils/errorTracking';

interface HealthCheck {
  name: string;
  status: 'pending' | 'healthy' | 'unhealthy' | 'warning';
  message?: string;
  critical: boolean;
}

export class ProductionHealthMonitor {
  private static instance: ProductionHealthMonitor;
  private checks: Map<string, HealthCheck> = new Map();
  private intervalId: number | null = null;

  static getInstance(): ProductionHealthMonitor {
    if (!ProductionHealthMonitor.instance) {
      ProductionHealthMonitor.instance = new ProductionHealthMonitor();
    }
    return ProductionHealthMonitor.instance;
  }

  async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // 1. Check Supabase Auth
    try {
      const { data: { session } } = await supabase.auth.getSession();
      checks.push({
        name: 'Authentication Service',
        status: session ? 'healthy' : 'warning',
        message: session ? 'Authenticated' : 'Not authenticated',
        critical: true
      });
    } catch (error) {
      checks.push({
        name: 'Authentication Service',
        status: 'unhealthy',
        message: 'Failed to connect',
        critical: true
      });
    }

    // 2. Check Database Connection
    try {
      const { error } = await supabase
        .from('journal_entries')
        .select('count')
        .limit(1);
      
      checks.push({
        name: 'Database',
        status: error ? 'unhealthy' : 'healthy',
        message: error?.message || 'Connected',
        critical: true
      });
    } catch (error) {
      checks.push({
        name: 'Database',
        status: 'unhealthy',
        message: 'Connection failed',
        critical: true
      });
    }

    // 3. Check Edge Functions
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const health = await response.json();
      checks.push({
        name: 'Edge Functions',
        status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
        message: `Latency: ${health.latency}ms`,
        critical: true
      });
    } catch (error) {
      checks.push({
        name: 'Edge Functions',
        status: 'unhealthy',
        message: 'Unreachable',
        critical: true
      });
    }

    // 4. Check Local Storage
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      checks.push({
        name: 'Local Storage',
        status: 'healthy',
        message: 'Available',
        critical: false
      });
    } catch (error) {
      checks.push({
        name: 'Local Storage',
        status: 'warning',
        message: 'Unavailable or full',
        critical: false
      });
    }

    // 5. Check Network Connectivity
    try {
      const online = navigator.onLine;
      checks.push({
        name: 'Network',
        status: online ? 'healthy' : 'unhealthy',
        message: online ? 'Online' : 'Offline',
        critical: true
      });
    } catch (error) {
      checks.push({
        name: 'Network',
        status: 'warning',
        message: 'Unknown',
        critical: true
      });
    }

    // 6. Check Sentry Error Tracking
    try {
      const sentryEnabled = import.meta.env.VITE_SENTRY_DSN ? true : false;
      checks.push({
        name: 'Error Tracking',
        status: sentryEnabled ? 'healthy' : 'warning',
        message: sentryEnabled ? 'Enabled' : 'Disabled',
        critical: false
      });
    } catch (error) {
      checks.push({
        name: 'Error Tracking',
        status: 'warning',
        message: 'Unknown',
        critical: false
      });
    }

    // Update internal state
    checks.forEach(check => {
      this.checks.set(check.name, check);
    });

    // Log critical failures
    const criticalFailures = checks.filter(c => c.critical && c.status === 'unhealthy');
    if (criticalFailures.length > 0) {
      errorTracker.trackError(new Error('Critical health check failures'), {
        component: 'ProductionHealthMonitor',
        failures: criticalFailures
      });
    }

    return checks;
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.intervalId) {
      return;
    }

    // Run initial check
    this.runHealthChecks();

    // Schedule periodic checks
    this.intervalId = window.setInterval(() => {
      this.runHealthChecks();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus(): { healthy: boolean; checks: HealthCheck[] } {
    const checks = Array.from(this.checks.values());
    const healthy = !checks.some(c => c.critical && c.status === 'unhealthy');
    
    return { healthy, checks };
  }
}

// Initialize monitoring in production
if (import.meta.env.PROD) {
  const monitor = ProductionHealthMonitor.getInstance();
  monitor.startMonitoring(300000); // Check every 5 minutes
}