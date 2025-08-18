import { getCorsHeaders } from './config.ts';

/**
 * Handle CORS preflight requests
 * @param req - The incoming request
 * @returns Response with appropriate CORS headers
 */
export function handleCorsPreflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Add CORS headers to a response
 * @param req - The original request
 * @param response - The response to add headers to
 * @returns Response with CORS headers
 */
export function withCors(req: Request, response: Response): Response {
  const corsHeaders = getCorsHeaders(req);
  
  // Add CORS headers to existing response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Create an error response with CORS headers
 * @param req - The original request
 * @param message - Error message
 * @param status - HTTP status code
 * @returns Error response with CORS headers
 */
export function corsError(req: Request, message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success response with CORS headers
 * @param req - The original request
 * @param data - Response data
 * @param status - HTTP status code
 * @returns Success response with CORS headers
 */
export function corsResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}