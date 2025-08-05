# Services Architecture

This directory contains all business logic services that provide a clean, testable abstraction layer over external APIs and database operations.

## 🏗️ Architecture Benefits

1. **Separation of Concerns**: Business logic is separated from UI components
2. **Testability**: Services can be easily mocked and tested in isolation
3. **Reusability**: Same service methods can be used across different components
4. **Type Safety**: Full TypeScript support with interfaces and types
5. **Error Handling**: Centralized error handling and logging
6. **Maintainability**: Changes to external APIs only require updates in one place

## 📦 Available Services

### 🔐 Auth Service (`auth.service.ts`)
Handles all authentication and user management operations.

**Key Methods:**
- `signUp()` - Register new user
- `signIn()` - Authenticate user
- `signOut()` - Log out user
- `getCurrentUser()` - Get authenticated user
- `updateUserProfile()` - Update user profile
- `resetPassword()` - Send password reset email
- `signInWithProvider()` - OAuth authentication

**Usage Example:**
```typescript
import { authService } from '@/services';

// Sign in user
const { user, error } = await authService.signIn({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const currentUser = await authService.getCurrentUser();

// Update profile
await authService.updateUserProfile(userId, {
  full_name: 'John Doe',
  avatar_url: 'https://...'
});
```

### 📝 Journal Service (`journal.service.ts`)
Manages all journal entry operations.

**Key Methods:**
- `createEntry()` - Create new journal entry
- `getEntries()` - Get paginated entries with filters
- `updateEntry()` - Update existing entry
- `deleteEntry()` - Delete entry
- `getStats()` - Get journal statistics
- `generateSummary()` - Generate AI summary
- `getCalendarEntries()` - Get entries for calendar view

**Usage Example:**
```typescript
import { journalService } from '@/services';

// Create entry
const entry = await journalService.createEntry(userId, {
  content: 'Today was a great day...',
  mood: 'happy',
  category: 'gratitude'
});

// Get entries with pagination
const { data, total, totalPages } = await journalService.getEntries({
  userId,
  page: 1,
  pageSize: 10,
  searchQuery: 'productivity',
  mood: 'motivated'
});

// Get statistics
const stats = await journalService.getStats(userId);
console.log(`Current streak: ${stats.currentStreak} days`);
```

### 💳 Stripe Service (`stripe.service.ts`)
Handles all payment and subscription operations.

**Key Methods:**
- `getPricingPlans()` - Get available plans
- `createCheckoutSession()` - Start checkout flow
- `createBillingPortalSession()` - Open billing management
- `getCurrentSubscription()` - Get active subscription
- `cancelSubscription()` - Cancel subscription
- `getPaymentMethods()` - Get saved payment methods

**Usage Example:**
```typescript
import { stripeService } from '@/services';

// Get pricing plans
const plans = await stripeService.getPricingPlans();

// Create checkout session
await stripeService.createCheckoutSession({
  priceId: 'price_123',
  userId: currentUser.id,
  successUrl: '/success',
  cancelUrl: '/pricing'
});

// Check subscription status
const hasAccess = await stripeService.hasActiveSubscription(userId);
```

### 🎨 Moodboard Service (`moodboard.service.ts`)
Manages vision boards and moodboards.

**Key Methods:**
- `createMoodboard()` - Create new moodboard
- `getMoodboards()` - Get paginated moodboards
- `updateElements()` - Update board elements
- `shareMoodboard()` - Create public share link
- `generateAIElements()` - Generate AI-powered elements
- `exportMoodboard()` - Export as JSON

**Usage Example:**
```typescript
import { moodboardService } from '@/services';

// Create moodboard
const board = await moodboardService.createMoodboard(userId, {
  title: 'My 2024 Goals',
  elements: [],
  theme: 'minimal'
});

// Generate AI elements
const elements = await moodboardService.generateAIElements(
  'Build a successful startup',
  'modern, minimalist style',
  'advanced'
);

// Share publicly
const shareUrl = await moodboardService.shareMoodboard(userId, {
  moodboardId: board.id,
  expiresIn: 168 // 7 days
});
```

### 📊 Analytics Service (`analytics.service.ts`)
Provides insights and analytics.

**Key Methods:**
- `getMoodAnalytics()` - Analyze mood patterns
- `getProgressMetrics()` - Track user progress
- `getUserInsights()` - Get personalized insights
- `getWeeklySummary()` - Weekly activity summary
- `getProductivityInsights()` - Productivity patterns

**Usage Example:**
```typescript
import { analyticsService } from '@/services';

// Get mood analytics
const moods = await analyticsService.getMoodAnalytics(userId);
console.log(`Mood trend: ${moods.moodTrend}`);

// Get progress metrics
const progress = await analyticsService.getProgressMetrics(userId);
console.log(`Vision Score: ${progress.visionScore}/100`);

// Get insights
const insights = await analyticsService.getUserInsights(userId);
console.log(`Most productive: ${insights.writingPatterns.mostActiveTime}`);
```

### 🔔 Notification Service (`notification.service.ts`)
Manages in-app notifications and toasts.

**Key Methods:**
- `success()` - Show success notification
- `error()` - Show error notification
- `warning()` - Show warning notification
- `info()` - Show info notification
- `confirm()` - Show confirmation dialog
- `showLoading()` - Show loading notification

**Usage Example:**
```typescript
import { notificationService } from '@/services';

// Show success
notificationService.success(
  'Entry Saved',
  'Your journal entry has been saved successfully'
);

// Show error with longer duration
notificationService.error(
  'Save Failed',
  'Unable to save your changes. Please try again.',
  10000 // 10 seconds
);

// Confirmation dialog
const confirmed = await notificationService.confirm(
  'Delete Entry',
  'Are you sure you want to delete this entry?'
);

if (confirmed) {
  await journalService.deleteEntry(entryId, userId);
}
```

## 🧪 Testing

Services are designed to be easily testable. Here's an example:

```typescript
// journal.service.test.ts
import { journalService } from '@/services';
import { supabase } from '@/core/api/supabase';

jest.mock('@/core/api/supabase');

describe('JournalService', () => {
  it('should create an entry', async () => {
    const mockEntry = { id: '1', content: 'Test' };
    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockEntry })
        })
      })
    });

    const result = await journalService.createEntry('user1', {
      content: 'Test'
    });

    expect(result).toEqual(mockEntry);
  });
});
```

## 🔌 Dependency Injection

Services can be injected for better testability:

```typescript
// In a React component
import { useServices } from '@/hooks/useServices';

function MyComponent() {
  const { authService, journalService } = useServices();
  
  // Use services...
}

// In tests
const mockAuthService: IAuthService = {
  signIn: jest.fn(),
  signOut: jest.fn(),
  // ... other methods
};

render(
  <ServicesProvider services={{ authService: mockAuthService }}>
    <MyComponent />
  </ServicesProvider>
);
```

## 🏛️ Service Patterns

### Singleton Pattern
All services are exported as singleton instances to ensure consistent state:

```typescript
class MyService {
  // Service implementation
}

export const myService = new MyService();
```

### Error Handling
Services handle errors gracefully and return predictable results:

```typescript
async getEntry(id: string): Promise<Entry | null> {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select()
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('GetEntry error:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('GetEntry error:', error);
    return null;
  }
}
```

### Type Safety
All services use TypeScript interfaces for inputs and outputs:

```typescript
export interface CreateEntryDto {
  content: string;
  mood?: string;
  category?: string;
}

async createEntry(userId: string, dto: CreateEntryDto): Promise<Entry> {
  // Implementation
}
```

## 📝 Best Practices

1. **Keep services focused** - Each service should handle one domain
2. **Use DTOs** - Define Data Transfer Objects for inputs
3. **Return consistent types** - Always return predictable types
4. **Handle errors gracefully** - Log errors and return safe defaults
5. **Document methods** - Use JSDoc comments for all public methods
6. **Avoid UI logic** - Services should not contain presentation logic
7. **Cache when appropriate** - Implement caching for expensive operations
8. **Use type guards** - Validate data at service boundaries

## 🚀 Future Enhancements

- [ ] Add caching layer with Redis
- [ ] Implement retry logic for failed requests
- [ ] Add request queuing for offline support
- [ ] Create service worker for background sync
- [ ] Add performance monitoring
- [ ] Implement circuit breaker pattern
- [ ] Add request deduplication
- [ ] Create service composition layer