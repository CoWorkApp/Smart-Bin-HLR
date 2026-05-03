import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { PhotoSourceSheet } from "@/components/PhotoSourceSheet";
import { uploadPhoto, resolvePhotoUri } from "@/lib/photoUpload";

export default function EditItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, bins, updateItem, getGroupBins, getLocationPath } = useApp();

  const item = items.find((i) => i.id === id);

  const [name, setName] = useState(item?.name ?? "");
  const [photo, setPhoto] = useState<string | undefined>(item?.photo);
  const [uploading, setUploading] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(item?.binId ?? null);
  const [qrCode, setQrCode] = useState(item?.qrCode ?? "");
  const [showBinPicker, setShowBinPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="package" title="Item not found" />
      </View>
    );
  }

  const allBins = getGroupBins();
  const selectedBin = selectedBinId ? allBins.find((b) => b.id === selectedBinId) : null;
  const binPath = selectedBin?.locationId
    ? getLocationPath(selectedBin.locationId).map((l) => l.name).join(" › ")
    : null;

  async function handleSave() {
    if (!name.trim()) return;
    let savedPhoto = photo;
    if (photo?.startsWith("file://") || photo?.startsWith("content://")) {
      try {
        setUploading(true);
        savedPhoto = await uploadPhoto(photo);
      } catch {
        Alert.alert("Upload failed", "Could not upload photo. The item will be saved without the new photo.");
        savedPhoto = item?.photo;
      } finally {
        setUploading(false);
      }
    }
    updateItem(id, {
      name: name.trim(),
      binId: selectedBinId,
      photo: savedPhoto,
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
      <Text style={[styles.title, { color: colors.foreground }]}>Edit Item</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Update the item name, bin, photo, or QR code.
      </Text>

      <Text style={[styles.label, { color: colors.foreground }]}>Item Name</Text>
      <TextInput
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        placeholder="e.g. Screwdriver, TV Remote, Passport"
        placeholderTextColor={colors.mutedForeground}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
      />

      <Text style={[styles.label, { color: colors.foreground }]}>Bin (optional)</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, { borderColor: selectedBin ? colors.primary : colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowBinPicker(true)}
      >
        <Feather name="archive" size={16} color={selectedBin ? colors.primary : colors.mutedForeground} />
        <View style={styles.pickerInfo}>
          <Text style={[styles.pickerBtnText, { color: selectedBin ? colors.foreground : colors.mutedForeground }]}>
            {selectedBin?.name ?? "No bin (unmapped)"}
          </Text>
          {binPath ? (
            <Text style={[styles.pickerSubText, { color: colors.mutedForeground }]}>{binPath}</Text>
          ) : null}
        </View>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.foreground }]}>Photo (optional)</Text>
      <TouchableOpacity
        style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowPhotoSheet(true)}
        activeOpacity={0.7}
      >
        {photo ? (
          <Image source={{ uri: resolvePhotoUri(photo) }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoEmpty}>
            <Feather name="camera" size={24} color={colors.mutedForeground} />
            <Text style={[styles.photoEmptyText, { color: colors.mutedForeground }]}>Add photo</Text>
          </View>
        )}
        {photo && (
          <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(undefined)}>
            <Feather name="x" size={14} color="#fff" />
          </TouchableOpacity>
        )}
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
          <Text style={[styles.qrBadgeText, { color: colors.primary }]}>QR code linked</Text>
          <TouchableOpacity onPress={() => setQrCode("")}>
            <Feather name="x" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: (!name.trim() || uploading) ? colors.muted : colors.primary }]}
        onPress={handleSave}
        disabled={!name.trim() || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.saveBtnText, { color: (!name.trim() || uploading) ? colors.mutedForeground : "#fff" }]}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>

      <Modal visible={showBinPicker} transparent animationType="slide" onRequestClose={() => setShowBinPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Bin</Text>
            <TouchableOpacity
              style={[styles.clearOption, { borderBottomColor: colors.border, backgroundColor: !selectedBinId ? `${colors.primary}10` : "transparent" }]}
              onPress={() => { setSelectedBinId(null); setShowBinPicker(false); }}
            >
              <Feather name="x-circle" size={14} color={!selectedBinId ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.clearOptionText, { color: !selectedBinId ? colors.primary : colors.foreground }]}>
                No bin (unmapped)
              </Text>
              {!selectedBinId && <Feather name="check" size={14} color={colors.primary} />}
            </TouchableOpacity>
            <FlatList
              data={allBins}
              keyExtractor={(b) => b.id}
              style={styles.binList}
              renderItem={({ item: b }) => {
                const bPath = b.locationId ? getLocationPath(b.locationId).map((l) => l.name).join(" › ") : "";
                return (
                  <TouchableOpacity
                    style={[styles.binOption, { borderBottomColor: colors.border, backgroundColor: b.id === selectedBinId ? `${colors.primary}10` : "transparent" }]}
                    onPress={() => { setSelectedBinId(b.id); setShowBinPicker(false); }}
                  >
                    <Feather name="archive" size={14} color={b.id === selectedBinId ? colors.primary : colors.mutedForeground} />
                    <View style={styles.binOptionInfo}>
                      <Text style={[styles.binOptionName, { color: colors.foreground }]}>{b.name}</Text>
                      {bPath ? <Text style={[styles.binOptionPath, { color: colors.mutedForeground }]}>{bPath}</Text> : null}
                    </View>
                    {b.id === selectedBinId && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={() => setShowBinPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PhotoSourceSheet
        visible={showPhotoSheet}
        onClose={() => setShowPhotoSheet(false)}
        onPhoto={(uri) => setPhoto(uri)}
      />

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
  pickerInfo: { flex: 1 },
  pickerBtnText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  pickerSubText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  photoBtn: { borderRadius: 12, borderWidth: 1, height: 120, overflow: "hidden", position: "relative" },
  photoPreview: { width: "100%", height: "100%" },
  photoEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  photoEmptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  removePhoto: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
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
  binList: { maxHeight: 280 },
  binOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  binOptionInfo: { flex: 1 },
  binOptionName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  binOptionPath: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  modalCancel: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", marginTop: 12 },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
