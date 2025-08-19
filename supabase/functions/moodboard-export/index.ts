import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { handleCorsPreflight, corsResponse, corsError } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const url = new URL(req.url);
    const moodboardId = url.searchParams.get('moodboardId');
    const format = url.searchParams.get('format') || 'json'; // json, html

    if (!moodboardId) {
      return corsError(req, 'moodboardId parameter required', 400);
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsError(req, 'Authorization header required', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return corsError(req, 'Unauthorized', 401);
    }

    // Fetch the moodboard
    const { data: moodboard, error } = await supabase
      .from('moodboards')
      .select('*')
      .eq('id', moodboardId)
      .eq('user_id', user.id)
      .single();

    if (error || !moodboard) {
      return corsError(req, 'Moodboard not found', 404);
    }

    if (format === 'html') {
      // Generate HTML representation
      const html = generateHTMLExport(moodboard);
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="moodboard-${moodboardId}.html"`,
          ...getCorsHeaders(req),
        },
      });
    } else {
      // JSON export
      const exportData = {
        title: moodboard.title,
        description: moodboard.description,
        elements: moodboard.board_data?.elements || [],
        theme: moodboard.board_data?.theme || 'default',
        created_at: moodboard.created_at,
        updated_at: moodboard.updated_at,
        exported_at: new Date().toISOString(),
      };

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="moodboard-${moodboardId}.json"`,
          ...getCorsHeaders(req),
        },
      });
    }
  } catch (error) {
    console.error('Moodboard export error:', error);
    return corsError(req, error.message || 'Internal server error', 500);
  }
});

function generateHTMLExport(moodboard: any): string {
  const elements = moodboard.board_data?.elements || [];
  
  const elementsHTML = elements.map((element: any) => {
    const style = `
      position: absolute;
      left: ${element.position?.x || 0}px;
      top: ${element.position?.y || 0}px;
      width: ${element.size?.width || 200}px;
      height: ${element.size?.height || 150}px;
      ${element.style?.backgroundColor ? `background-color: ${element.style.backgroundColor};` : ''}
      ${element.style?.color ? `color: ${element.style.color};` : ''}
      ${element.style?.fontSize ? `font-size: ${element.style.fontSize}px;` : ''}
      ${element.style?.borderRadius ? `border-radius: ${element.style.borderRadius}px;` : ''}
      padding: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    if (element.type === 'image' && element.metadata?.imageUrl) {
      return `<div style="${style}">
        <img src="${element.metadata.imageUrl}" alt="${element.content || ''}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />
      </div>`;
    } else if (element.type === 'text' || element.type === 'affirmation' || element.type === 'quote') {
      return `<div style="${style}">
        <p style="margin: 0; ${element.style?.textAlign ? `text-align: ${element.style.textAlign};` : ''}">${element.content || ''}</p>
      </div>`;
    } else if (element.type === 'goal') {
      return `<div style="${style}">
        <h3 style="margin: 0 0 10px 0;">Goal</h3>
        <p style="margin: 0;">${element.content || ''}</p>
        ${element.metadata?.dueDate ? `<small>Due: ${new Date(element.metadata.dueDate).toLocaleDateString()}</small>` : ''}
      </div>`;
    }
    return '';
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${moodboard.title || 'My Vision Board'}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }
    .canvas {
      position: relative;
      width: 90vw;
      max-width: 1200px;
      height: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${moodboard.title || 'My Vision Board'}</h1>
    ${moodboard.description ? `<p>${moodboard.description}</p>` : ''}
  </div>
  <div class="canvas">
    ${elementsHTML}
  </div>
  <div class="footer">
    <p>Created with MyFutureSelf • Exported on ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}