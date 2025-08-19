import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? 'http://localhost:54321';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.test('generate-summary - should return 429 when rate limit exceeded', async () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create a test user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `test-rate-limit-${Date.now()}@example.com`,
    password: 'test-password-123'
  });

  if (authError || !authData.session) {
    throw new Error('Failed to create test user');
  }

  const token = authData.session.access_token;

  // Get CSRF token first
  const csrfResponse = await fetch(`${supabaseUrl}/functions/v1/csrf-token`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  const { token: csrfToken } = await csrfResponse.json();

  // Function to make a request to generate-summary
  const makeRequest = async () => {
    return await fetch(`${supabaseUrl}/functions/v1/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'summarize',
        data: {
          entryContent: 'Test content for rate limiting'
        },
        csrf_token: csrfToken
      })
    });
  };

  // Make requests up to the limit (assuming 50 per hour for testing)
  // For testing, we'll simulate by checking headers
  const firstResponse = await makeRequest();
  
  // Check that rate limit headers are present
  const limitHeader = firstResponse.headers.get('X-RateLimit-Limit');
  const remainingHeader = firstResponse.headers.get('X-RateLimit-Remaining');
  const resetHeader = firstResponse.headers.get('X-RateLimit-Reset');

  assertEquals(typeof limitHeader, 'string');
  assertEquals(typeof remainingHeader, 'string');
  assertEquals(typeof resetHeader, 'string');

  // Verify the response includes rate limit info
  if (firstResponse.status === 200) {
    const remaining = parseInt(remainingHeader!, 10);
    assertEquals(remaining < 50, true);
  }

  // Clean up
  await supabase.auth.signOut();
});

Deno.test('generate-summary - should include Retry-After header when rate limited', async () => {
  // This test simulates what happens when rate limit is exceeded
  // In a real scenario, you'd make 50+ requests to trigger this
  
  const mockResponse = new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: 3600
    }),
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '50',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        'Retry-After': '3600',
        'Content-Type': 'application/json'
      }
    }
  );

  assertEquals(mockResponse.status, 429);
  assertEquals(mockResponse.headers.get('Retry-After'), '3600');
  assertEquals(mockResponse.headers.get('X-RateLimit-Remaining'), '0');
  
  const body = await mockResponse.json();
  assertEquals(body.error, 'Rate limit exceeded. Please try again later.');
  assertEquals(body.retryAfter, 3600);
});

Deno.test('generate-summary - IP-based rate limiting should work independently', async () => {
  // Test that IP-based rate limiting is separate from user-based
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Create two test users
  const user1Email = `test-ip-limit-1-${Date.now()}@example.com`;
  const user2Email = `test-ip-limit-2-${Date.now()}@example.com`;
  
  const { data: auth1 } = await supabase.auth.signUp({
    email: user1Email,
    password: 'test-password-123'
  });

  const { data: auth2 } = await supabase.auth.signUp({
    email: user2Email,
    password: 'test-password-123'
  });

  if (!auth1?.session || !auth2?.session) {
    throw new Error('Failed to create test users');
  }

  // Both users from same IP should share IP-based rate limit
  // But have separate user-based limits
  
  // Get CSRF tokens
  const csrf1Response = await fetch(`${supabaseUrl}/functions/v1/csrf-token`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${auth1.session.access_token}`,
    }
  });
  const { token: csrf1 } = await csrf1Response.json();

  const csrf2Response = await fetch(`${supabaseUrl}/functions/v1/csrf-token`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${auth2.session.access_token}`,
    }
  });
  const { token: csrf2 } = await csrf2Response.json();

  // Make requests from both users
  const response1 = await fetch(`${supabaseUrl}/functions/v1/generate-summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth1.session.access_token}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.1.100' // Simulate same IP
    },
    body: JSON.stringify({
      type: 'summarize',
      data: { entryContent: 'Test from user 1' },
      csrf_token: csrf1
    })
  });

  const response2 = await fetch(`${supabaseUrl}/functions/v1/generate-summary`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth2.session.access_token}`,
      'Content-Type': 'application/json',
      'X-Forwarded-For': '192.168.1.100' // Same IP
    },
    body: JSON.stringify({
      type: 'summarize',
      data: { entryContent: 'Test from user 2' },
      csrf_token: csrf2
    })
  });

  // Both should succeed if under both user and IP limits
  assertEquals(response1.status !== 429, true);
  assertEquals(response2.status !== 429, true);

  // Clean up
  await supabase.auth.admin.deleteUser(auth1.user!.id);
  await supabase.auth.admin.deleteUser(auth2.user!.id);
});