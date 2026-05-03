import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BinDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bins, getBinItems, getLocationPath, deleteBin, moveBin, getGroupLocations, locations } = useApp();
  const [showMove, setShowMove] = useState(false);

  const bin = bins.find((b) => b.id === id);
  if (!bin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="archive" title="Bin not found" />
      </View>
    );
  }

  const items = getBinItems(bin.id);
  const locationPath = bin.locationId ? getLocationPath(bin.locationId) : [];
  const pathStr = locationPath.map((l) => l.name).join(" › ");
  const allLocations = getGroupLocations();

  function handleDelete() {
    Alert.alert("Delete Bin", `Delete "${bin!.name}" and all ${items.length} items inside?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBin(bin!.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Feather name="archive" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.heroName, { color: colors.foreground }]}>{bin.name}</Text>
        <View style={[styles.locationPill, { backgroundColor: colors.muted }]}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.locationPillText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {" "}{pathStr || "No location"}
          </Text>
        </View>
        <Text style={[styles.itemCount, { color: colors.primary }]}>{items.length} {items.length === 1 ? "item" : "items"}</Text>
      </View>

      <View style={styles.actionsRow}>
        <ActionBtn icon="plus" label="Add Item" color={colors.primary} onPress={() => router.push({ pathname: "/add-item", params: { binId: id } })} />
        <ActionBtn icon="edit-2" label="Edit" color="#0D9488" onPress={() => router.push({ pathname: "/edit-bin", params: { id } })} />
        <ActionBtn icon="move" label="Move" color="#8B5CF6" onPress={() => setShowMove(true)} />
        <ActionBtn icon="trash-2" label="Delete" color={colors.destructive} onPress={handleDelete} />
      </View>

      {items.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items in this bin</Text>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} showPath={false} />
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon="package" title="No items yet" subtitle="Add an item to this bin to start tracking" />
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/add-item", params: { binId: id } })}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showMove} transparent animationType="slide" onRequestClose={() => setShowMove(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Move to Location</Text>
            <FlatList
              data={allLocations}
              keyExtractor={(l) => l.id}
              style={styles.locationList}
              renderItem={({ item: loc }) => {
                const lPath = getLocationPath(loc.id).map((l) => l.name).join(" › ");
                return (
                  <TouchableOpacity
                    style={[styles.locOption, { borderBottomColor: colors.border, backgroundColor: loc.id === bin!.locationId ? `${colors.primary}10` : "transparent" }]}
                    onPress={() => {
                      moveBin(bin!.id, loc.id);
                      setShowMove(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Feather name="map-pin" size={14} color={loc.id === bin!.locationId ? colors.primary : colors.mutedForeground} />
                    <View style={styles.locOptionInfo}>
                      <Text style={[styles.locOptionName, { color: colors.foreground }]}>{loc.name}</Text>
                      {lPath !== loc.name && <Text style={[styles.locOptionPath, { color: colors.mutedForeground }]}>{lPath}</Text>}
                    </View>
                    {loc.id === bin!.locationId && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setShowMove(false)}>
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 0 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8, marginBottom: 16 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 4 },
  locationPill: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, maxWidth: "100%" },
  locationPillText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  itemCount: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  empty: { marginTop: 20, alignItems: "center", gap: 16, height: 220 },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  addItemText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  locationList: { maxHeight: 320 },
  locOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  locOptionInfo: { flex: 1 },
  locOptionName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  locOptionPath: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  modalCancel: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", marginTop: 12 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
