import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/lib/auth";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";

SplashScreen.preventAutoHideAsync();

try {
  initializeRevenueCat();
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  // RevenueCat keys not configured yet — subscription features unavailable
  console.warn("RevenueCat init skipped:", msg);
}

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const onLoginScreen = segments[0] === "login";

    if (!isAuthenticated && !onLoginScreen) {
      router.replace("/login");
    } else if (isAuthenticated && onLoginScreen) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) return null;
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="location/[id]" options={{ title: "Location", headerBackTitle: "Back" }} />
      <Stack.Screen name="bin/[id]" options={{ title: "Bin", headerBackTitle: "Back" }} />
      <Stack.Screen name="item/[id]" options={{ title: "Item", headerBackTitle: "Back" }} />
      <Stack.Screen name="add-location" options={{ title: "Add Location", presentation: "modal", headerBackTitle: "Cancel" }} />
      <Stack.Screen name="add-bin" options={{ title: "Add Bin", presentation: "modal", headerBackTitle: "Cancel" }} />
      <Stack.Screen name="add-item" options={{ title: "Add Item", presentation: "modal", headerBackTitle: "Cancel" }} />
      <Stack.Screen name="scan-result" options={{ title: "QR Scanned", presentation: "modal", headerBackTitle: "Cancel" }} />
      <Stack.Screen name="paywall" options={{ title: "Upgrade", presentation: "modal", headerBackTitle: "Cancel" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <AppProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AuthGate>
                    <RootLayoutNav />
                  </AuthGate>
                </GestureHandlerRootView>
              </AppProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
