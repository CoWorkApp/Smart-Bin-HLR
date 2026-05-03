import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Location } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";

interface Props {
  location: Location;
  level?: number;
}

export function LocationCard({ location, level = 0 }: Props) {
  const colors = useColors();
  const { getChildLocations, getLocationBins, getBinItems } = useApp();
  const children = getChildLocations(location.id);
  const bins = getLocationBins(location.id);
  const itemCount = bins.reduce((sum, b) => sum + getBinItems(b.id).length, 0);

  const icons: Array<keyof typeof Feather.glyphMap> = ["home", "box", "layers"];
  const icon = icons[Math.min(level, icons.length - 1)];
  const bgColors = ["#0D948815", "#F59E0B15", "#8B5CF615"];
  const fgColors = [colors.primary, "#F59E0B", "#8B5CF6"];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginLeft: level * 12 }]}
      onPress={() => router.push(`/location/${location.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: bgColors[Math.min(level, 2)] }]}>
          <Feather name={icon} size={18} color={fgColors[Math.min(level, 2)]} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{location.name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {bins.length} {bins.length === 1 ? "bin" : "bins"} · {itemCount} items
            {children.length > 0 ? ` · ${children.length} sub-locations` : ""}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
