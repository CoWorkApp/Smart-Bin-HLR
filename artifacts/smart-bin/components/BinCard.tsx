import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Bin } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";

interface Props {
  bin: Bin;
  showLocation?: boolean;
}

export function BinCard({ bin, showLocation = true }: Props) {
  const colors = useColors();
  const { getLocationPath, getBinItems } = useApp();
  const path = showLocation && bin.locationId ? getLocationPath(bin.locationId).map((l) => l.name).join(" › ") : "";
  const itemCount = getBinItems(bin.id).length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/bin/${bin.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
          <Feather name="archive" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{bin.name}</Text>
          {showLocation && path ? (
            <View style={styles.pathRow}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text style={[styles.path, { color: colors.mutedForeground }]} numberOfLines={1}> {path}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.countWrap}>
          <Text style={[styles.count, { color: colors.primary }]}>{itemCount}</Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>items</Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  pathRow: { flexDirection: "row", alignItems: "center" },
  path: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countWrap: { alignItems: "center" },
  count: { fontSize: 18, fontFamily: "Inter_700Bold" },
  countLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
