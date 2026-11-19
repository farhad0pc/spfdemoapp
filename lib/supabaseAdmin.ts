import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Strip any accidental trailing slashes or subpaths such as /rest/v1
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

const supabaseServiceKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

/**
 * Server-only Supabase admin client.
 * Uses the Service Role key to bypass Row-Level Security for administrative operations:
 * - Creating Supabase Auth users
 * - Verifying failsafe credentials
 * - Managing invitations and corporate user profiles
 * 
 * NEVER import this file into client components ('use client').
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
