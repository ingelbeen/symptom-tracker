// src/useAuth.js
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  return {
    user, loading,
    signUp: async (email, pw) => { const { data, error } = await supabase.auth.signUp({ email, password: pw }); if (error) throw error; return data; },
    signIn: async (email, pw) => { const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw }); if (error) throw error; return data; },
    signOut: async () => { const { error } = await supabase.auth.signOut(); if (error) throw error; },
  };
}
