import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { QRScanModal } from "@/components/QRScanModal";
import { EmptyState } from "@/components/EmptyState";

export default function EditLocation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { locations, updateLocation, getLocationPath } = useApp();

  const location = locations.find((l) => l.id === id);

  const [name, setName] = useState(location?.name ?? "");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(location?.parentId ?? null);
  const [qrCode, setQrCode] = useState(location?.qrCode ?? "");
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="map-pin" title="Location not found" />
      </View>
    );
  }

  const availableParents = locations.filter((l) => l.id !== id);
  const selectedParent = selectedParentId ? availableParents.find((l) => l.id === selectedParentId) : null;
  const parentPath = selectedParent
    ? getLocationPath(selectedParent.id).map((l) => l.name).join(" › ")
    : null;

  function handleSave() {
    if (!name.trim()) return;
    updateLocation(id, {
      name: name.trim(),
      parentId: selectedParentId,
      qrCode: qrCode.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Edit Location</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Update the location name, parent, or QR code assignment.
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>Location Name</Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        placeholder="e.g. Living Room, Storage Unit"
        placeholderTextColor={colors.mutedForeground}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Parent Location (optional)</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { borderColor: selectedParent ? colors.primary : colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowParentPicker(true)}
      >
        <Feather name="home" size={16} color={selectedParent ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.pickerBtnText, { color: selectedParent ? colors.foreground : colors.mutedForeground }]}>
          {parentPath ?? "Top-level location (no parent)"}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.foreground }]}>QR Code (optional)</Text>
      <View style={styles.qrRow}>
        <TextInput
          style={[styles.qrInput, { color: colors.foreground, borderColor: qrCode ? colors.primary : colors.border, backgroundColor: colors.card }]}
          placeholder="Scan or type a QR code value"
          placeholderTextColor={colors.mutedForeground}
          value={qrCode}
          onChangeText={setQrCode}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <TouchableOpacity style={[styles.scanBtn, { backgroundColor: colors.primary }]} onPress={() => setShowScanner(true)}>
          <Feather name="camera" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {qrCode ? (
        <View style={[styles.qrBadge, { backgroundColor: `${colors.primary}12` }]}>
          <Feather name="check-circle" size={13} color={colors.primary} />
          <Text style={[styles.qrBadgeText, { color: colors.primary }]}>QR code assigned</Text>
          <TouchableOpacity onPress={() => setQrCode("")}>
            <Feather name="x" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: !name.trim() ? colors.muted : colors.primary }]}
        onPress={handleSave}
        disabled={!name.trim()}
      >
        <Text style={[styles.saveBtnText, { color: !name.trim() ? colors.mutedForeground : "#fff" }]}>
          Save Changes
        </Text>
      </TouchableOpacity>

      <Modal visible={showParentPicker} transparent animationType="slide" onRequestClose={() => setShowParentPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Parent Location</Text>
            <TouchableOpacity
              style={[styles.clearOption, { borderBottomColor: colors.border, backgroundColor: !selectedParentId ? `${colors.primary}10` : "transparent" }]}
              onPress={() => { setSelectedParentId(null); setShowParentPicker(false); }}
            >
              <Feather name="x-circle" size={14} color={!selectedParentId ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.clearOptionText, { color: !selectedParentId ? colors.primary : colors.foreground }]}>
                Top-level (no parent)
              </Text>
              {!selectedParentId && <Feather name="check" size={14} color={colors.primary} />}
            </TouchableOpacity>
            <FlatList
              data={availableParents}
              keyExtractor={(l) => l.id}
              style={styles.locationList}
              renderItem={({ item: loc }) => {
                const lPath = getLocationPath(loc.id).map((l) => l.name).join(" › ");
                return (
                  <TouchableOpacity
                    style={[styles.locOption, { borderBottomColor: colors.border, backgroundColor: loc.id === selectedParentId ? `${colors.primary}10` : "transparent" }]}
                    onPress={() => { setSelectedParentId(loc.id); setShowParentPicker(false); }}
                  >
                    <Feather name="home" size={14} color={loc.id === selectedParentId ? colors.primary : colors.mutedForeground} />
                    <View style={styles.locOptionInfo}>
                      <Text style={[styles.locOptionName, { color: colors.foreground }]}>{loc.name}</Text>
                      {lPath !== loc.name && <Text style={[styles.locOptionPath, { color: colors.mutedForeground }]}>{lPath}</Text>}
                    </View>
                    {loc.id === selectedParentId && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setShowParentPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <QRScanModal visible={showScanner} onScan={(code) => setQrCode(code)} onClose={() => setShowScanner(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular" },
  pickerBtn: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  pickerBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  qrRow: { flexDirection: "row", gap: 8 },
  qrInput: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  scanBtn: { width: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qrBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  qrBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "75%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  clearOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  clearOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  locationList: { maxHeight: 280 },
  locOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  locOptionInfo: { flex: 1 },
  locOptionName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  locOptionPath: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  modalCancel: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", marginTop: 12 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
