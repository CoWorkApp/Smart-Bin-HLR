import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading, isInIframe, isReady } = useAuth();
  const colors = useColors();

  const openInNewTab = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(window.location.href, "_blank");
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, "#0a7568"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>📦</Text>
          </View>

          <Text style={styles.title}>Find My Things</Text>
          <Text style={styles.subtitle}>
            Smart Bin — know where everything is, always.
          </Text>

          <View style={styles.features}>
            {[
              "QR scan any bin or location",
              "Search across all your spaces",
              "Share with family or team",
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          {Platform.OS === "web" && isInIframe ? (
            <>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.card }]}
                onPress={openInNewTab}
                activeOpacity={0.85}
              >
                <Feather
                  name="external-link"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[styles.loginBtnText, { color: colors.primary }]}
                >
                  Open in Browser to Sign In
                </Text>
              </TouchableOpacity>
              <Text style={styles.iframeNote}>
                Sign-in requires opening the app in a full browser tab.
              </Text>
            </>
          ) : (
            <>
              {/* Replit / primary sign-in */}
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.card }]}
                onPress={login}
                disabled={isLoading || !isReady}
                activeOpacity={0.85}
              >
                {isLoading || !isReady ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text
                    style={[styles.loginBtnText, { color: colors.primary }]}
                  >
                    Get Started
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: "rgba(255,255,255,0.25)" },
                  ]}
                />
                <Text style={styles.dividerText}>or</Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: "rgba(255,255,255,0.25)" },
                  ]}
                />
              </View>

              {/* Google sign-in */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={loginWithGoogle}
                disabled={isLoading || !isReady}
                activeOpacity={0.85}
              >
                <GoogleLogo />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function GoogleLogo() {
  return (
    <View style={styles.googleLogoWrap}>
      <Text style={styles.googleLogoText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 280,
  },
  features: { gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_600SemiBold",
  },
  featureText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Inter_400Regular",
  },
  bottom: { paddingBottom: 16, gap: 12 },
  loginBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  googleBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleLogoWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogoText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1f2937",
  },
  iframeNote: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  legal: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 4,
  },
});
