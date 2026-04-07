import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureAnonymousUser } from "@/lib/roomApi";

export function useAnonymousAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void ensureAnonymousUser()
      .then((nextUser) => {
        if (!cancelled) {
          setUser(nextUser);
          setLoading(false);
        }
      })
      .catch((authError) => {
        if (!cancelled) {
          setError(authError instanceof Error ? authError.message : "Auth failed.");
          setLoading(false);
        }
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
