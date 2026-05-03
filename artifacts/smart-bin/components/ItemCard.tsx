import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Bin, Item, Location } from "@/context/AppContext";

interface Props {
  item: Item;
  bin?: Bin;
  locationPath?: Location[];
  showPath?: boolean;
}

export function ItemCard({ item, bin, locationPath = [], showPath = true }: Props) {
  const colors = useColors();
  const pathStr = locationPath.map((l) => l.name).join(" › ");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/item/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={[styles.photo, { borderRadius: 8 }]} />
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
            <Feather name="package" size={20} color={colors.primary} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          {showPath && bin && (
            <View style={styles.pathRow}>
              <Feather name="archive" size={11} color={colors.mutedForeground} />
              <Text style={[styles.path, { color: colors.mutedForeground }]} numberOfLines={1}>
                {" "}{bin.name}
              </Text>
              {pathStr ? (
                <>
                  <Text style={[styles.path, { color: colors.mutedForeground }]}> · </Text>
                  <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.path, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {" "}{pathStr}
                  </Text>
                </>
              ) : null}
            </View>
          )}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  photo: { width: 44, height: 44 },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  pathRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  path: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
