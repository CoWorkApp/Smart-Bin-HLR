import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const ENTITLEMENT_LITE = "lite";
export const ENTITLEMENT_PRO = "pro";

export type Plan = "free" | "lite" | "pro";

export const PLAN_ITEM_LIMITS: Record<Plan, number | null> = {
  free: null,
  lite: 5,
  pro: 5000,
};

const DEV_PLAN_KEY = "@smartbin_dev_plan_override";

function getRevenueCatApiKey(): string {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found");
  }
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat(userId?: string) {
  const apiKey = getRevenueCatApiKey();
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  if (userId) {
    Purchases.logIn(userId);
  }
}

function useSubscriptionContext() {
  const [devPlanOverride, setDevPlanOverrideState] = useState<Plan | null>(null);
  const [devOverrideLoaded, setDevOverrideLoaded] = useState(false);

  useEffect(() => {
    if (!__DEV__) { setDevOverrideLoaded(true); return; }
    AsyncStorage.getItem(DEV_PLAN_KEY).then((v) => {
      if (v === "free" || v === "lite" || v === "pro") setDevPlanOverrideState(v);
      setDevOverrideLoaded(true);
    });
  }, []);

  const setDevPlanOverride = useCallback(async (plan: Plan | null) => {
    if (!__DEV__) return;
    setDevPlanOverrideState(plan);
    if (plan === null) {
      await AsyncStorage.removeItem(DEV_PLAN_KEY);
    } else {
      await AsyncStorage.setItem(DEV_PLAN_KEY, plan);
    }
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const activeEntitlements = customerInfoQuery.data?.entitlements.active ?? {};
  const isPro_rc = ENTITLEMENT_PRO in activeEntitlements;
  const isLite_rc = ENTITLEMENT_LITE in activeEntitlements;
  const plan_rc: Plan = isPro_rc ? "pro" : isLite_rc ? "lite" : "free";

  const plan: Plan = (__DEV__ && devOverrideLoaded && devPlanOverride !== null)
    ? devPlanOverride
    : plan_rc;

  const isPro = plan === "pro";
  const isLite = plan === "lite";
  const itemLimit = PLAN_ITEM_LIMITS[plan];

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    plan,
    isPro,
    isLite,
    isCloud: isPro || isLite,
    itemLimit,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading || !devOverrideLoaded,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    refetchCustomerInfo: customerInfoQuery.refetch,
    devPlanOverride,
    setDevPlanOverride,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
