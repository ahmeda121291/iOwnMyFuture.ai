import { z } from 'zod';

// Base validation schemas
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const DateSchema = z.string().datetime('Invalid date format');
export const NonEmptyStringSchema = z.string().min(1, 'Field cannot be empty');

// Sanitization helpers
const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const createSanitizedStringSchema = (minLength?: number, maxLength?: number) => {
  let schema = z.string();
  if (minLength !== undefined) {
    schema = schema.min(minLength, `Must be at least ${minLength} characters`);
  }
  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `Must be at most ${maxLength} characters`);
  }
  return schema.transform(sanitizeHtml);
};

// CSRF Token Schema
export const CSRFTokenSchema = z.object({
  token: z.string().min(32, 'Invalid CSRF token'),
  timestamp: z.number().int().positive(),
});

// Journal Entry Schemas
export const MoodSchema = z.enum([
  'happy', 'sad', 'neutral', 'excited', 'anxious', 
  'grateful', 'stressed', 'motivated'
]);

export const CategorySchema = z.enum([
  'gratitude', 'goals', 'reflection', 'dreams', 
  'challenges', 'achievements', 'general'
]);

export const CreateJournalEntrySchema = z.object({
  entry_date: DateSchema,
  content: createSanitizedStringSchema(1, 50000),
  mood: MoodSchema.optional(),
  category: CategorySchema.optional(),
  tags: z.array(
    z.string()
      .min(1, 'Tag cannot be empty')
      .max(50, 'Tag exceeds maximum length')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag contains invalid characters')
  ).max(20, 'Too many tags').optional(),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

export const UpdateJournalEntrySchema = CreateJournalEntrySchema.partial().extend({
  id: UUIDSchema,
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Moodboard Element Schemas
export const ElementTypeSchema = z.enum(['text', 'image', 'goal', 'affirmation', 'quote']);

export const PositionSchema = z.object({
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(2000),
});

export const SizeSchema = z.object({
  width: z.number().min(10).max(1000),
  height: z.number().min(10).max(1000),
});

export const StyleSchema = z.object({
  fontSize: z.number().min(8).max(72).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/, 'Invalid color format').optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgb\(|^rgba\(|^hsl\(|^hsla\(|^transparent$/, 'Invalid background color format').optional(),
  borderRadius: z.number().min(0).max(50).optional(),
  fontWeight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  transform: z.string().max(200).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  border: z.string().max(100).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  padding: z.number().min(0).max(50).optional(),
});

export const MetadataSchema = z.object({
  imageUrl: z.string().url('Invalid image URL').optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: DateSchema.optional(),
});

export const MoodboardElementSchema = z.object({
  id: UUIDSchema,
  type: ElementTypeSchema,
  content: createSanitizedStringSchema(1, 5000),
  position: PositionSchema,
  size: SizeSchema,
  style: StyleSchema,
  metadata: MetadataSchema.optional(),
});

// Moodboard Schemas
export const ThemeSchema = z.enum(['light', 'dark', 'custom']);

export const BoardDataSchema = z.object({
  elements: z.array(MoodboardElementSchema).max(100, 'Too many elements on moodboard'),
  goals: createSanitizedStringSchema(undefined, 2000).optional(),
  preferences: createSanitizedStringSchema(undefined, 1000).optional(),
  theme: ThemeSchema.optional(),
  background: z.string().max(500, 'Background URL too long').optional(),
});

export const CreateMoodboardSchema = z.object({
  title: createSanitizedStringSchema(1, 200).optional(),
  description: createSanitizedStringSchema(undefined, 1000).optional(),
  board_data: BoardDataSchema,
  is_public: z.boolean().default(false),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

export const UpdateMoodboardSchema = CreateMoodboardSchema.partial().extend({
  id: UUIDSchema,
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Profile Schemas
export const UpdateProfileSchema = z.object({
  full_name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name exceeds maximum length')
    .regex(/^[a-zA-Z\s\-.']+$/, 'Name contains invalid characters')
    .transform(sanitizeHtml).optional(),
  user_metadata: z.object({
    full_name: z.string()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name exceeds maximum length')
      .regex(/^[a-zA-Z\s\-.']+$/, 'Name contains invalid characters')
      .transform(sanitizeHtml).optional(),
    avatar_url: z.string().url('Invalid avatar URL').max(500, 'Avatar URL too long').optional(),
  }).optional(),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Onboarding Schemas
export const OnboardingPreferencesSchema = z.object({
  journaling_frequency: z.enum(['daily', 'weekly', 'occasional']).optional(),
  primary_goals: z.array(
    createSanitizedStringSchema(1, 200)
  ).max(10, 'Too many primary goals').optional(),
  interests: z.array(
    z.string()
      .min(1, 'Interest cannot be empty')
      .max(100, 'Interest exceeds maximum length')
      .regex(/^[a-zA-Z0-9\s\-_&]+$/, 'Interest contains invalid characters')
      .transform(sanitizeHtml)
  ).max(20, 'Too many interests').optional(),
});

export const UpdateOnboardingSchema = z.object({
  step: z.number().int().min(1).max(10),
  completed_steps: z.array(z.string().max(50)).max(20),
  preferences: OnboardingPreferencesSchema.optional(),
  completed: z.boolean(),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Public Snapshot Schemas
export const CreatePublicSnapshotSchema = z.object({
  moodboard_id: UUIDSchema,
  title: createSanitizedStringSchema(1, 200).optional(),
  description: createSanitizedStringSchema(undefined, 1000).optional(),
  expires_at: DateSchema.optional(),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Social Integration Schemas
export const ServiceNameSchema = z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'pinterest']);

export const UpdateSocialIntegrationSchema = z.object({
  service_name: ServiceNameSchema,
  connected: z.boolean(),
  permissions: z.array(z.string().max(100)).max(20).optional(),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// AI Generation Schemas
export const GenerateSummarySchema = z.object({
  type: z.enum(['summarize', 'generate_moodboard', 'generate_insights', 'generate_advanced_moodboard', 'analyze_progress']),
  data: z.object({
    entryContent: createSanitizedStringSchema(undefined, 50000).optional(),
    userGoals: createSanitizedStringSchema(undefined, 2000).optional(),
    preferences: createSanitizedStringSchema(undefined, 1000).optional(),
    existingElements: z.array(z.unknown()).max(50).optional(),
    journalSummaries: z.array(createSanitizedStringSchema(undefined, 1000)).max(100).optional(),
    moodboardData: z.unknown().optional(),
  }),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Stripe Schemas
export const CreateCheckoutSessionSchema = z.object({
  price_id: z.string().min(1, 'Price ID required'),
  mode: z.enum(['subscription', 'payment']),
  success_url: z.string().url('Invalid success URL'),
  cancel_url: z.string().url('Invalid cancel URL'),
  csrf_token: z.string().min(32, 'CSRF token required'),
});

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  orderBy: z.string().max(50).optional(),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
});

// Export validation helper types
export type CreateJournalEntry = z.infer<typeof CreateJournalEntrySchema>;
export type UpdateJournalEntry = z.infer<typeof UpdateJournalEntrySchema>;
export type CreateMoodboard = z.infer<typeof CreateMoodboardSchema>;
export type UpdateMoodboard = z.infer<typeof UpdateMoodboardSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type UpdateOnboarding = z.infer<typeof UpdateOnboardingSchema>;
export type CreatePublicSnapshot = z.infer<typeof CreatePublicSnapshotSchema>;
export type UpdateSocialIntegration = z.infer<typeof UpdateSocialIntegrationSchema>;
export type GenerateSummary = z.infer<typeof GenerateSummarySchema>;
export type CreateCheckoutSession = z.infer<typeof CreateCheckoutSessionSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;

// Validation helper function
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
};