import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { EmptyState } from "@/components/EmptyState";
import { resolvePhotoUri } from "@/lib/photoUpload";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, bins, getLocationPath, deleteItem, moveItem, getGroupBins } = useApp();
  const [showMove, setShowMove] = useState(false);

  const item = items.find((i) => i.id === id);
  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="package" title="Item not found" />
      </View>
    );
  }

  const bin = item.binId ? bins.find((b) => b.id === item.binId) : undefined;
  const locationPath = bin?.locationId ? getLocationPath(bin.locationId) : [];
  const pathStr = locationPath.map((l) => l.name).join(" › ");
  const allBins = getGroupBins();

  function handleDelete() {
    Alert.alert("Delete Item", `Delete "${item!.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteItem(item!.id);
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
      {item.photo ? (
        <Image source={{ uri: resolvePhotoUri(item.photo) }} style={styles.photo} />
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: `${colors.primary}15` }]}>
          <Feather name="package" size={48} color={colors.primary} />
        </View>
      )}

      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>

      <View style={[styles.whereCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.whereLabel, { color: colors.mutedForeground }]}>LOCATED IN</Text>
        {bin ? (
          <>
            <TouchableOpacity onPress={() => router.push(`/bin/${bin.id}`)} activeOpacity={0.8}>
              <View style={styles.binRow}>
                <View style={[styles.binIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Feather name="archive" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.binName, { color: colors.foreground }]}>{bin.name}</Text>
                  <Text style={[styles.binPath, { color: colors.mutedForeground }]}>Tap to open bin</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.chevron} />
              </View>
            </TouchableOpacity>
            {pathStr ? (
              <View style={[styles.pathRow, { borderTopColor: colors.border }]}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pathText, { color: colors.foreground }]}>{pathStr}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={[styles.noBin, { color: colors.mutedForeground }]}>
            {item.binId ? "Bin not found" : "No bin assigned"}
          </Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <ActionBtn icon="edit-2" label="Edit" color="#0D9488" onPress={() => router.push({ pathname: "/edit-item", params: { id: item.id } })} />
        <ActionBtn icon="move" label="Move Item" color="#8B5CF6" onPress={() => setShowMove(true)} />
        <ActionBtn icon="trash-2" label="Delete" color={colors.destructive} onPress={handleDelete} />
      </View>

      <Modal visible={showMove} transparent animationType="slide" onRequestClose={() => setShowMove(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Move to Bin</Text>
            <FlatList
              data={allBins}
              keyExtractor={(b) => b.id}
              style={styles.binList}
              renderItem={({ item: b }) => {
                const bPath = b.locationId ? getLocationPath(b.locationId).map((l) => l.name).join(" › ") : "";
                return (
                  <TouchableOpacity
                    style={[styles.binOption, { borderBottomColor: colors.border, backgroundColor: b.id === item.binId ? `${colors.primary}10` : "transparent" }]}
                    onPress={() => {
                      moveItem(item.id, b.id);
                      setShowMove(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Feather name="archive" size={14} color={b.id === item.binId ? colors.primary : colors.mutedForeground} />
                    <View style={styles.binOptionInfo}>
                      <Text style={[styles.binOptionName, { color: colors.foreground }]}>{b.name}</Text>
                      {bPath ? <Text style={[styles.binOptionPath, { color: colors.mutedForeground }]}>{bPath}</Text> : null}
                    </View>
                    {b.id === item.binId && <Feather name="check" size={14} color={colors.primary} />}
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
  content: { padding: 16, alignItems: "center" },
  photo: { width: "100%", height: 220, borderRadius: 16, marginBottom: 16 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  itemName: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 20 },
  whereCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  whereLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 12 },
  binRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  binIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  binName: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  binPath: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  chevron: { marginLeft: "auto" },
  pathRow: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  pathText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  noBin: { fontSize: 14, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 20 },
  actionBtn: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "70%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  binList: { maxHeight: 320 },
  binOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  binOptionInfo: { flex: 1 },
  binOptionName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  binOptionPath: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  modalCancel: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", marginTop: 12 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
