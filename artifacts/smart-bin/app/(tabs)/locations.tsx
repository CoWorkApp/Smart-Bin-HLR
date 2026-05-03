import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { LocationCard } from "@/components/LocationCard";
import { BinCard } from "@/components/BinCard";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";

export default function LocationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getRootLocations, getUnmappedBins, getUnmappedItems } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const rootLocations = getRootLocations();
  const unmappedBins = getUnmappedBins();
  const unmappedItems = getUnmappedItems();

  const [binsExpanded, setBinsExpanded] = useState(true);
  const [itemsExpanded, setItemsExpanded] = useState(true);

  const hasUnmapped = unmappedBins.length > 0 || unmappedItems.length > 0;
  const hasContent = hasUnmapped || rootLocations.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Locations</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/add-bin")}
          >
            <Feather name="archive" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/add-location")}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {!hasContent ? (
        <View style={styles.empty}>
          <EmptyState
            icon="map-pin"
            title="No locations yet"
            subtitle="Add your first location like a room or storage area"
          />
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/add-location")}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={[styles.emptyBtnText, { color: "#fff" }]}>Add Location</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {unmappedBins.length > 0 && (
            <View style={[styles.unmappedSection, { backgroundColor: colors.card, borderColor: "#F59E0B40" }]}>
              <TouchableOpacity
                style={styles.unmappedHeader}
                onPress={() => setBinsExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.unmappedIconWrap, { backgroundColor: "#F59E0B15" }]}>
                  <Feather name="archive" size={16} color="#F59E0B" />
                </View>
                <View style={styles.unmappedTitleWrap}>
                  <Text style={[styles.unmappedTitle, { color: colors.foreground }]}>Unmapped Bins</Text>
                  <Text style={[styles.unmappedSub, { color: colors.mutedForeground }]}>
                    Not assigned to a location
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "#F59E0B20" }]}>
                  <Text style={[styles.countBadgeText, { color: "#D97706" }]}>{unmappedBins.length}</Text>
                </View>
                <Feather
                  name={binsExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
              {binsExpanded && (
                <View style={styles.unmappedList}>
                  {unmappedBins.map((bin) => (
                    <BinCard key={bin.id} bin={bin} showLocation={false} />
                  ))}
                  <TouchableOpacity
                    style={[styles.assignBtn, { borderColor: "#F59E0B60" }]}
                    onPress={() => router.push("/add-bin")}
                  >
                    <Feather name="plus" size={13} color="#F59E0B" />
                    <Text style={[styles.assignBtnText, { color: "#D97706" }]}>Add Another Unmapped Bin</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {unmappedItems.length > 0 && (
            <View style={[styles.unmappedSection, { backgroundColor: colors.card, borderColor: "#8B5CF640" }]}>
              <TouchableOpacity
                style={styles.unmappedHeader}
                onPress={() => setItemsExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.unmappedIconWrap, { backgroundColor: "#8B5CF615" }]}>
                  <Feather name="package" size={16} color="#8B5CF6" />
                </View>
                <View style={styles.unmappedTitleWrap}>
                  <Text style={[styles.unmappedTitle, { color: colors.foreground }]}>Unmapped Items</Text>
                  <Text style={[styles.unmappedSub, { color: colors.mutedForeground }]}>
                    Not assigned to a bin
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "#8B5CF620" }]}>
                  <Text style={[styles.countBadgeText, { color: "#7C3AED" }]}>{unmappedItems.length}</Text>
                </View>
                <Feather
                  name={itemsExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
              {itemsExpanded && (
                <View style={styles.unmappedList}>
                  {unmappedItems.map((item) => (
                    <ItemCard key={item.id} item={item} showPath={false} />
                  ))}
                  <TouchableOpacity
                    style={[styles.assignBtn, { borderColor: "#8B5CF660" }]}
                    onPress={() => router.push("/add-item")}
                  >
                    <Feather name="plus" size={13} color="#8B5CF6" />
                    <Text style={[styles.assignBtnText, { color: "#7C3AED" }]}>Add Another Unmapped Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {rootLocations.length > 0 && (
            <>
              {hasUnmapped && (
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LOCATIONS</Text>
              )}
              {rootLocations.map((loc) => (
                <LocationCard key={loc.id} location={loc} level={0} />
              ))}
            </>
          )}

          {rootLocations.length === 0 && (
            <TouchableOpacity
              style={[styles.addLocationRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/add-location")}
            >
              <Feather name="plus-circle" size={18} color={colors.primary} />
              <Text style={[styles.addLocationText, { color: colors.primary }]}>Add a Location</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 0 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  unmappedSection: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  unmappedHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  unmappedIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unmappedTitleWrap: { flex: 1 },
  unmappedTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  unmappedSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  countBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  countBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unmappedList: { paddingHorizontal: 10, paddingBottom: 10, gap: 0 },
  assignBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4, alignSelf: "flex-start" },
  assignBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  addLocationRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  addLocationText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
