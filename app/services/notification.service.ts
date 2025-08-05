export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // milliseconds
  action?: {
    label: string;
    handler: () => void;
  };
}

interface NotificationItem extends NotificationOptions {
  id: string;
  timestamp: Date;
}

/**
 * Notification Service
 * Handles in-app notifications and toasts
 */
class NotificationService {
  private notifications: NotificationItem[] = [];
  private listeners: Set<(notifications: NotificationItem[]) => void> = new Set();
  private notificationTimeout: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Show a notification
   */
  show(options: NotificationOptions): string {
    const id = this.generateId();
    const notification: NotificationItem = {
      ...options,
      id,
      timestamp: new Date(),
      duration: options.duration ?? 5000, // Default 5 seconds
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-dismiss after duration
    if (notification.duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
      
      this.notificationTimeout.set(id, timeout);
    }

    return id;
  }

  /**
   * Show success notification
   */
  success(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration,
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: duration ?? 10000, // Errors stay longer
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration,
    });
  }

  /**
   * Show info notification
   */
  info(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration,
    });
  }

  /**
   * Dismiss a notification
   */
  dismiss(id: string): void {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      
      // Clear timeout if exists
      const timeout = this.notificationTimeout.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.notificationTimeout.delete(id);
      }
      
      this.notifyListeners();
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    // Clear all timeouts
    this.notificationTimeout.forEach(timeout => clearTimeout(timeout));
    this.notificationTimeout.clear();
    
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all active notifications
   */
  getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Show confirmation dialog
   */
  async confirm(
    title: string,
    message: string,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const id = this.show({
        type: 'info',
        title,
        message,
        duration: 0, // Don't auto-dismiss
        action: {
          label: confirmLabel,
          handler: () => {
            this.dismiss(id);
            resolve(true);
          },
        },
      });

      // Add cancel handler
      setTimeout(() => {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
          // Extend notification with cancel action
          const originalAction = notification.action;
          notification.action = {
            label: `${cancelLabel} | ${originalAction?.label}`,
            handler: () => {
              this.dismiss(id);
              resolve(false);
            },
          };
          this.notifyListeners();
        }
      }, 0);
    });
  }

  /**
   * Show loading notification
   */
  showLoading(message: string): string {
    return this.show({
      type: 'info',
      title: 'Loading',
      message,
      duration: 0, // Don't auto-dismiss
    });
  }

  /**
   * Update a notification
   */
  update(id: string, updates: Partial<NotificationOptions>): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      Object.assign(notification, updates);
      this.notifyListeners();
    }
  }

  /**
   * Common notification messages
   */
  readonly messages = {
    // Success messages
    ENTRY_SAVED: 'Journal entry saved successfully',
    MOODBOARD_SAVED: 'Vision board saved successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    SUBSCRIPTION_CREATED: 'Subscription activated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    
    // Error messages
    NETWORK_ERROR: 'Network error. Please check your connection.',
    AUTH_ERROR: 'Authentication error. Please sign in again.',
    SAVE_ERROR: 'Failed to save. Please try again.',
    LOAD_ERROR: 'Failed to load data. Please refresh.',
    PERMISSION_ERROR: 'You don\'t have permission to perform this action.',
    
    // Info messages
    LOADING: 'Loading...',
    SAVING: 'Saving...',
    PROCESSING: 'Processing...',
    GENERATING: 'Generating AI content...',
    
    // Warning messages
    UNSAVED_CHANGES: 'You have unsaved changes',
    SESSION_EXPIRING: 'Your session will expire soon',
    QUOTA_WARNING: 'You\'re approaching your monthly limit',
  };

  // Private helper methods
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyListeners(): void {
    const notifications = this.getNotifications();
    this.listeners.forEach(listener => listener(notifications));
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export type for dependency injection
export type INotificationService = NotificationService;