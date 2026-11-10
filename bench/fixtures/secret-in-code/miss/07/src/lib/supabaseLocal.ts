import { createClient } from '@supabase/supabase-js';
// Only used against supabase start on localhost.
export const local = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicmVmIjoicXpsbXZ0eHdrcnBqaGdmZHNhYm4iLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMTUwMDAwMDB9.I-Ojmo0_EIS8QKbNTvyzP76BF8KNdxM7n7uW-XYhQVP');
