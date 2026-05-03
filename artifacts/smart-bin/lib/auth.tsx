import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = "auth_session_token";
const ISSUER_URL =
  process.env.EXPO_PUBLIC_ISSUER_URL ?? "https://replit.com/oidc";
const GOOGLE_ISSUER_URL = "https://accounts.google.com";

// sessionStorage keys that survive the OIDC redirect
const WEB_VERIFIER_KEY = "oidc_pkce_verifier";
const WEB_STATE_KEY = "oidc_pkce_state";
const WEB_REDIRECT_URI_KEY = "oidc_redirect_uri";
const WEB_PROVIDER_KEY = "oidc_provider"; // "replit" | "google"

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInIframe: boolean;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInIframe: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  }
  return "";
}

function getClientId(): string {
  return process.env.EXPO_PUBLIC_REPL_ID || "";
}

function getGoogleClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
}

// ── Web PKCE helpers (Web Crypto API) ────────────────────────────────────────

function webGenerateVerifier(): string {
  const buf = new Uint8Array(32);
  window.crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function webGenerateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function webGenerateState(): string {
  const buf = new Uint8Array(16);
  window.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── AuthProvider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Per-code exchange guards — prevent double-exchanging the same code
  const exchangedCodeRef = useRef<string | null>(null);
  const exchangedGoogleCodeRef = useRef<string | null>(null);

  // Detect iframe
  const isInIframe = (() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // ── Hooks — always called unconditionally (React rules) ───────────────────
  const replitDiscovery = AuthSession.useAutoDiscovery(ISSUER_URL);
  const googleDiscovery = AuthSession.useAutoDiscovery(GOOGLE_ISSUER_URL);

  const nativeRedirectUri = AuthSession.makeRedirectUri();
  const googleRedirectUri = AuthSession.makeRedirectUri({
    scheme: "smart-bin",
    path: "google-auth",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: ["openid", "email", "profile", "offline_access"],
      redirectUri: nativeRedirectUri,
      prompt: AuthSession.Prompt.Login,
    },
    Platform.OS !== "web" ? replitDiscovery : null,
  );

  const [googleRequest, googleResponse, promptGoogleAsync] =
    AuthSession.useAuthRequest(
      {
        clientId: getGoogleClientId(),
        scopes: ["openid", "email", "profile"],
        redirectUri: googleRedirectUri,
        prompt: AuthSession.Prompt.SelectAccount,
      },
      Platform.OS !== "web" ? googleDiscovery : null,
    );

  // ── fetchUser ─────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Web: check for OIDC callback params in URL on mount ──────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code && state) {
      window.history.replaceState({}, "", window.location.pathname);

      const storedState = sessionStorage.getItem(WEB_STATE_KEY);
      const verifier = sessionStorage.getItem(WEB_VERIFIER_KEY);
      const storedRedirectUri = sessionStorage.getItem(WEB_REDIRECT_URI_KEY);
      const provider = sessionStorage.getItem(WEB_PROVIDER_KEY) ?? "replit";

      sessionStorage.removeItem(WEB_VERIFIER_KEY);
      sessionStorage.removeItem(WEB_STATE_KEY);
      sessionStorage.removeItem(WEB_REDIRECT_URI_KEY);
      sessionStorage.removeItem(WEB_PROVIDER_KEY);

      if (verifier && storedRedirectUri && state === storedState) {
        handleWebCallback(code, verifier, storedRedirectUri, state, provider);
        return;
      }
    }

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Native: session check on mount ────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    fetchUser();
  }, [fetchUser]);

  // ── Web: exchange code after redirect ────────────────────────────────────
  async function handleWebCallback(
    code: string,
    verifier: string,
    redirectUri: string,
    state: string,
    provider: string,
  ) {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      if (!apiBase) return;

      const endpoint =
        provider === "google"
          ? `${apiBase}/api/mobile-auth/google-exchange`
          : `${apiBase}/api/mobile-auth/token-exchange`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
          state,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
          await fetchUser();
          return;
        }
      }
    } catch (err) {
      console.error("Web token exchange error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Web: build OIDC URL and navigate ─────────────────────────────────────
  async function startWebOidcFlow(
    issuer: string,
    clientId: string,
    scopes: string,
    provider: string,
  ) {
    let authEndpoint = `${issuer}/auth`;
    try {
      const resp = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await resp.json();
      if (config.authorization_endpoint) {
        authEndpoint = config.authorization_endpoint;
      }
    } catch {
      // fall back to conventional endpoint
    }

    const verifier = webGenerateVerifier();
    const challenge = await webGenerateChallenge(verifier);
    const state = webGenerateState();
    const redirectUri =
      window.location.origin +
      (window.location.pathname === "/" ? "/" : window.location.pathname);

    sessionStorage.setItem(WEB_VERIFIER_KEY, verifier);
    sessionStorage.setItem(WEB_STATE_KEY, state);
    sessionStorage.setItem(WEB_REDIRECT_URI_KEY, redirectUri);
    sessionStorage.setItem(WEB_PROVIDER_KEY, provider);

    const authUrl = new URL(authEndpoint);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    window.location.href = authUrl.toString();
  }

  // ── Native: Replit OIDC response ─────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (response?.type !== "success" || !request?.codeVerifier) return;

    const { code, state } = response.params;
    if (exchangedCodeRef.current === code) return;
    exchangedCodeRef.current = code;

    (async () => {
      try {
        const apiBase = getApiBaseUrl();
        if (!apiBase) return;

        const res = await fetch(`${apiBase}/api/mobile-auth/token-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            code_verifier: request.codeVerifier,
            redirect_uri: nativeRedirectUri,
            state,
            nonce: (request as unknown as Record<string, unknown>)["nonce"],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
            setIsLoading(true);
            await fetchUser();
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Token exchange error:", err);
        setIsLoading(false);
      }
    })();
  }, [response, request, nativeRedirectUri, fetchUser]);

  // ── Native: Google OIDC response ─────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (googleResponse?.type !== "success" || !googleRequest?.codeVerifier)
      return;

    const { code, state } = googleResponse.params;
    if (exchangedGoogleCodeRef.current === code) return;
    exchangedGoogleCodeRef.current = code;

    (async () => {
      try {
        const apiBase = getApiBaseUrl();
        if (!apiBase) return;

        const res = await fetch(`${apiBase}/api/mobile-auth/google-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            code_verifier: googleRequest.codeVerifier,
            redirect_uri: googleRedirectUri,
            state,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
            setIsLoading(true);
            await fetchUser();
          }
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Google exchange error:", err);
        setIsLoading(false);
      }
    })();
  }, [googleResponse, googleRequest, googleRedirectUri, fetchUser]);

  // ── login / loginWithGoogle / logout ──────────────────────────────────────
  const login = useCallback(async () => {
    if (Platform.OS === "web") {
      await startWebOidcFlow(
        ISSUER_URL,
        getClientId(),
        "openid email profile offline_access",
        "replit",
      );
      return;
    }
    try {
      await promptAsync();
    } catch (err) {
      console.error("Login error:", err);
    }
  }, [promptAsync]);

  const loginWithGoogle = useCallback(async () => {
    if (!getGoogleClientId() || getGoogleClientId() === "YOUR_GOOGLE_CLIENT_ID_HERE") {
      console.warn(
        "Google client ID not configured. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.",
      );
      return;
    }
    if (Platform.OS === "web") {
      await startWebOidcFlow(
        GOOGLE_ISSUER_URL,
        getGoogleClientId(),
        "openid email profile",
        "google",
      );
      return;
    }
    try {
      await promptGoogleAsync();
    } catch (err) {
      console.error("Google login error:", err);
    }
  }, [promptGoogleAsync]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/api/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
    } finally {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isInIframe,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
