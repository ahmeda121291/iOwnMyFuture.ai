/**
 * Central export for all application services
 * These services provide a clean, testable abstraction layer over external APIs
 */

export { authService } from './auth.service';
export type { AuthCredentials, AuthResponse, UserProfile, IAuthService } from './auth.service';

export { journalService } from './journal.service';
export type { 
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
  JournalQueryOptions,
  JournalStats,
  PaginatedResponse,
  IJournalService 
} from './journal.service';

export { stripeService } from './stripe.service';
export type {
  PricingPlan,
  Subscription,
  CheckoutSessionOptions,
  BillingPortalOptions,
  PaymentMethod,
  IStripeService
} from './stripe.service';

export { moodboardService } from './moodboard.service';
export type {
  CreateMoodboardDto,
  UpdateMoodboardDto,
  MoodboardQueryOptions,
  IMoodboardService
} from './moodboard.service';

export { analyticsService } from './analytics.service';
export type {
  MoodAnalytics,
  ProgressMetrics,
  UserInsights,
  IAnalyticsService
} from './analytics.service';

export { notificationService } from './notification.service';
export type {
  NotificationType,
  NotificationOptions,
  INotificationService
} from './notification.service';