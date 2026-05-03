import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}

const CORNER = 24;
const FRAME = 240;

export function QRScanModal({ visible, onScan, onClose }: Props) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualCode("");
    }
  }, [visible]);

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    onClose();
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    setManualCode("");
    onClose();
  }

  // ── Web fallback ────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.webSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.webHeader}>
              <Text style={[styles.webTitle, { color: colors.foreground }]}>
                Enter QR Code
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.webSub, { color: colors.mutedForeground }]}>
              Camera scanning isn't supported on web. Type the QR code value
              manually.
            </Text>
            <TextInput
              style={[
                styles.webInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Paste or type the QR code value"
              placeholderTextColor={colors.mutedForeground}
              value={manualCode}
              onChangeText={setManualCode}
              autoFocus
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.webBtn,
                {
                  backgroundColor: manualCode.trim()
                    ? colors.primary
                    : colors.muted,
                },
              ]}
              onPress={handleManualSubmit}
              disabled={!manualCode.trim()}
            >
              <Text
                style={[
                  styles.webBtnText,
                  {
                    color: manualCode.trim() ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                Use This Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelText, { color: colors.mutedForeground }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Native: permission required ────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={[styles.nativeContainer, { backgroundColor: "#0a0a0a" }]}>
          <View style={styles.permBox}>
            <Feather name="camera-off" size={40} color="#fff" />
            <Text style={styles.permTitle}>Camera Access Needed</Text>
            <Text style={styles.permSub}>
              Allow camera access to scan QR codes on your bins and locations.
            </Text>
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16 }} onPress={onClose}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Native: camera scanner ─────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.nativeContainer, { backgroundColor: "#0a0a0a" }]}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.nativeTop}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.nativeTitle}>Scan QR Code</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
        <View style={styles.nativeBottom}>
          <Text style={styles.nativeHint}>
            {scanned ? "✓ QR detected!" : "Point at a QR code"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Web
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  webSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  webTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  webSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  webInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  webBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  webBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // Native
  nativeContainer: { flex: 1 },
  nativeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  nativeTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: FRAME, height: FRAME, position: "relative" },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#fff",
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  nativeBottom: { paddingBottom: 80, alignItems: "center" },
  nativeHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  // Permission
  permBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  permTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  permSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  permBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
