import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ScanResult() {
  const { qr } = useLocalSearchParams<{ qr: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: "#F59E0B15" }]}>
          <Feather name="help-circle" size={36} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>QR Not Recognized</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          This QR code isn't linked to any bin, location, or item in your group.
        </Text>
        <View style={[styles.qrBox, { backgroundColor: colors.muted }]}>
          <Text
            style={[styles.qrText, { color: colors.mutedForeground }]}
            numberOfLines={3}
            selectable
          >
            {qr}
          </Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Assign this QR code to:
      </Text>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }]}
        onPress={() => router.replace({ pathname: "/add-bin", params: { qrCode: qr } })}
      >
        <Feather name="archive" size={18} color="#fff" />
        <Text style={styles.btnText}>Assign to New Bin</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#8B5CF6" }]}
        onPress={() => router.replace({ pathname: "/add-location", params: { qrCode: qr } })}
      >
        <Feather name="map-pin" size={18} color="#fff" />
        <Text style={styles.btnText}>Assign to New Location</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: "#F59E0B" }]}
        onPress={() => router.replace({ pathname: "/add-item", params: { qrCode: qr } })}
      >
        <Feather name="package" size={18} color="#fff" />
        <Text style={styles.btnText}>Assign to New Item</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cancelBtn, { borderColor: colors.border }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  qrBox: { borderRadius: 8, padding: 10, width: "100%" },
  qrText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 4,
    marginBottom: -4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    padding: 16,
  },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
