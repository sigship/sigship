supabase.auth.onAuthStateChange((_e, session) => {
  console.log('Session:', session?.access_token);
});
