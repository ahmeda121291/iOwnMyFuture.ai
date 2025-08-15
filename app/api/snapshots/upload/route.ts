// app/api/snapshots/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY; // SERVER ONLY

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: 'Missing SUPABASE env vars' }, { status: 500 });
    }

    // parse multipart form-data
    const form = await req.formData();
    const file = form.get('file');
    const userId = form.get('userId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // admin client (service role bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // stable storage path
    const safeName = (file as File).name.replace(/[^\w.\-]/g, '_');
    const path = `${userId}/${Date.now()}_${safeName}`;

    // upload to PUBLIC bucket
    const { error } = await supabase.storage.from('public-snapshots').upload(path, file as File, { upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // public URL for OG/Twitter
    const url = `${SUPABASE_URL}/storage/v1/object/public/public-snapshots/${encodeURIComponent(path)}`;
    return NextResponse.json({ url, path });
  } catch (e) {
    console.error('upload error', e);
    return new NextResponse('Upload failed', { status: 500 });
  }
}
