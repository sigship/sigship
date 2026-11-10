import { createClient } from '@supabase/supabase-js';

const url = 'https://qzlmvtxwkrpjhgfdsabn.supabase.co';
export const supabaseAdmin = createClient(url, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bG12dHh3a3JwamhnZmRzYWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDE1MDAwMDAwfQ.WMAbBaGX2RDcx8GHUWaajBcG88EJW37BaRThPIngBnR');
