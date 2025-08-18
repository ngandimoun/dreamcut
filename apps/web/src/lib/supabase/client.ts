import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from './types';

export const createClient = () => {
  return createClientComponentClient<Database>({
    options: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
};

export const supabase = createClient();
