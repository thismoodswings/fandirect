import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

function buildProfile(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || "fan",
    display_name:
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "FanDirect User",
    creator_id: user.user_metadata?.creator_id || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase session error:", error);
        }

        if (!mounted) return;

        const currentUser = session?.user || null;

        setUser(currentUser);
        setProfile(buildProfile(currentUser));
        setIsAuthenticated(Boolean(currentUser));
      } catch (error) {
        console.error("Auth load failed:", error);

        if (mounted) {
          setAuthError(error);
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);
      setProfile(buildProfile(currentUser));
      setIsAuthenticated(Boolean(currentUser));
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setAuthError(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error);
        return { error };
      }

      const currentUser = data?.user || null;
      const resolvedProfile = buildProfile(currentUser);

      setUser(currentUser);
      setProfile(resolvedProfile);
      setIsAuthenticated(Boolean(currentUser));

      return { data, profile: resolvedProfile };
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(error);
      return { error };
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }

  async function register(email, password, role = "fan", displayName = "") {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            display_name: displayName || email.split("@")[0],
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setAuthError(error);
        return { error };
      }

      const currentUser = data?.session?.user || null;
      const resolvedProfile = buildProfile(currentUser);

      setUser(currentUser);
      setProfile(resolvedProfile);
      setIsAuthenticated(Boolean(currentUser));

      return {
        data,
        profile: resolvedProfile,
        needsEmailConfirmation: Boolean(data?.user && !data?.session),
      };
    } catch (error) {
      console.error("Register failed:", error);
      setAuthError(error);
      return { error };
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }

  async function sendMagicLink(email, role = "fan") {
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { role },
        },
      });

      if (error) {
        setAuthError(error);
        return { error };
      }

      return { success: true };
    } catch (error) {
      console.error("Magic link failed:", error);
      setAuthError(error);
      return { error };
    }
  }

  async function logout(shouldRedirect = true) {
    await supabase.auth.signOut();

    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);

    if (shouldRedirect) {
      window.location.href = "/login";
    }
  }

  async function checkUserAuth() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user || null;

      setUser(currentUser);
      setProfile(buildProfile(currentUser));
      setIsAuthenticated(Boolean(currentUser));
      setAuthChecked(true);
      setIsLoadingAuth(false);

      return currentUser;
    } catch (error) {
      console.error("checkUserAuth failed:", error);
      setAuthError(error);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }
  }

  function navigateToLogin() {
    window.location.href = "/login";
  }

  function getHomeRoute() {
    if (profile?.role === "admin") return "/admin";
    if (profile?.role === "creator") return "/creator-portal";
    return "/dashboard";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoadingAuth,
        authError,
        authChecked,

        isFan: profile?.role === "fan",
        isCreator: profile?.role === "creator",
        isAdmin: profile?.role === "admin",
        userRole: profile?.role || null,

        login,
        register,
        logout,
        sendMagicLink,
        navigateToLogin,
        checkUserAuth,
        getHomeRoute,

        appPublicSettings: null,
        isLoadingPublicSettings: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}