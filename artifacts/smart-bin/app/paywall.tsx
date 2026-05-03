import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSubscription, PLAN_ITEM_LIMITS, type Plan } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";

type OfferingKey = "lite" | "pro";

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { offerings, plan, purchase, restore, isPurchasing, isRestoring } =
    useSubscription();
  const [selected, setSelected] = useState<OfferingKey>("pro");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const liteOffering = offerings?.all?.["lite"];
  const proOffering = offerings?.all?.["pro"];
  const litePackage = liteOffering?.availablePackages?.[0];
  const proPackage = proOffering?.availablePackages?.[0];
  const litePrice = litePackage?.product?.priceString ?? "$1.49/mo";
  const proPrice = proPackage?.product?.priceString ?? "$2.99/mo";

  const handlePurchase = async () => {
    const pkg = selected === "lite" ? litePackage : proPackage;
    if (!pkg) {
      Alert.alert("Not available", "This plan is not available right now.");
      return;
    }
    try {
      await purchase(pkg);
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      if (!msg.includes("cancelled")) Alert.alert("Purchase failed", msg);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch {
      Alert.alert("Error", "Could not restore purchases.");
    }
  };

  const handlePromoSubmit = () => {
    Alert.alert(
      "Promo code",
      `Code "${promoCode}" submitted — backend validation coming soon.`,
    );
    setShowPromo(false);
    setPromoCode("");
  };

  type PlanInfo = {
    key: OfferingKey;
    name: string;
    price: string;
    features: string[];
  };

  const plans: PlanInfo[] = [
    {
      key: "lite",
      name: "Lite",
      price: litePrice,
      features: [
        "Cloud sync & backup",
        "Up to 100 items",
        "1 group, 2 members",
        "QR scanning",
      ],
    },
    {
      key: "pro",
      name: "Pro",
      price: proPrice,
      features: [
        "Cloud sync & backup",
        "Up to 5,000 items",
        "Multiple groups & members",
        "QR scanning",
        "Priority support",
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Upgrade your plan
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            You are currently on the{" "}
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.primary }}>
              {plan.toUpperCase()}
            </Text>{" "}
            plan.
          </Text>
        </View>

        {plans.map((p) => {
          const isActive = selected === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                isActive && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "10",
                },
              ]}
              onPress={() => setSelected(p.key)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.planName,
                    { color: isActive ? colors.primary : colors.text },
                  ]}
                >
                  {p.name}
                </Text>
                <Text
                  style={[
                    styles.planPrice,
                    { color: isActive ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {p.price}
                </Text>
              </View>

              <View style={styles.featureList}>
                {p.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text
                      style={[
                        styles.check,
                        { color: isActive ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      ✓
                    </Text>
                    <Text style={[styles.featureText, { color: colors.foreground }]}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>

              {isActive && (
                <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.purchaseBtn, { backgroundColor: colors.primary }]}
          onPress={handlePurchase}
          disabled={isPurchasing || isRestoring}
          activeOpacity={0.85}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseBtnText}>
              Subscribe to {selected === "lite" ? "Lite" : "Pro"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowPromo(true)}
          style={styles.promoLink}
        >
          <Text style={[styles.promoLinkText, { color: colors.primary }]}>
            Have a promo code?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRestore}
          style={styles.restoreLink}
          disabled={isRestoring}
        >
          <Text style={[styles.restoreLinkText, { color: colors.mutedForeground }]}>
            {isRestoring ? "Restoring…" : "Restore purchases"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPromo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enter promo code
            </Text>
            <TextInput
              style={[
                styles.promoInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. EARLYBIRD2025"
              placeholderTextColor={colors.mutedForeground}
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowPromo(false);
                  setPromoCode("");
                }}
                style={[styles.modalCancel, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePromoSubmit}
                style={[styles.modalSubmit, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalSubmitText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, alignItems: "center" },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  featureList: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  selectedBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 12,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  purchaseBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  purchaseBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  promoLink: { alignItems: "center", paddingVertical: 10 },
  promoLinkText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  restoreLink: { alignItems: "center", paddingVertical: 8 },
  restoreLinkText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 24, width: "100%" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 16 },
  promoInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  modalSubmit: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSubmitText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
