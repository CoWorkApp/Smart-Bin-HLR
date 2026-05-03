import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { BinCard } from "@/components/BinCard";
import { LocationCard } from "@/components/LocationCard";
import { EmptyState } from "@/components/EmptyState";

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locations, getChildLocations, getLocationBins, getLocationPath, deleteLocation, getBinItems } = useApp();

  const location = locations.find((l) => l.id === id);
  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState icon="map-pin" title="Location not found" />
      </View>
    );
  }

  const children = getChildLocations(location.id);
  const bins = getLocationBins(location.id);
  const path = getLocationPath(location.id);
  const breadcrumb = path.map((l) => l.name).join(" › ");
  const totalItems = bins.reduce((s, b) => s + getBinItems(b.id).length, 0);

  function handleDelete() {
    Alert.alert(
      "Delete Location",
      `Delete "${location!.name}" and all its contents? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLocation(location!.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Feather name="home" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.heroName, { color: colors.foreground }]}>{location.name}</Text>
        {path.length > 1 && (
          <Text style={[styles.heroBreadcrumb, { color: colors.mutedForeground }]}>{breadcrumb}</Text>
        )}
        <View style={styles.heroStats}>
          <HeroStat value={children.length} label="Sub-locations" />
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <HeroStat value={bins.length} label="Bins" />
          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
          <HeroStat value={totalItems} label="Items" />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <ActionBtn icon="plus" label="Add Bin" color={colors.primary} onPress={() => router.push({ pathname: "/add-bin", params: { locationId: id } })} />
        <ActionBtn icon="map-pin" label="Sub-loc" color="#8B5CF6" onPress={() => router.push({ pathname: "/add-location", params: { parentId: id } })} />
        <ActionBtn icon="edit-2" label="Edit" color="#0D9488" onPress={() => router.push({ pathname: "/edit-location", params: { id } })} />
        <ActionBtn icon="trash-2" label="Delete" color={colors.destructive} onPress={handleDelete} />
      </View>

      {children.length > 0 && (
        <>
          <SectionHeader title="Sub-locations" colors={colors} />
          {children.map((child) => (
            <LocationCard key={child.id} location={child} level={1} />
          ))}
        </>
      )}

      {bins.length > 0 ? (
        <>
          <SectionHeader title="Bins" colors={colors} />
          {bins.map((bin) => (
            <BinCard key={bin.id} bin={bin} showLocation={false} />
          ))}
        </>
      ) : (
        <View style={styles.emptyBins}>
          <EmptyState icon="archive" title="No bins here" subtitle="Add a bin to start organizing items in this location" />
        </View>
      )}
    </ScrollView>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatVal, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 0 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8, marginBottom: 16 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4 },
  heroBreadcrumb: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  heroDivider: { width: 1, height: 32 },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10, marginTop: 4 },
  emptyBins: { marginTop: 20, height: 180 },
});
