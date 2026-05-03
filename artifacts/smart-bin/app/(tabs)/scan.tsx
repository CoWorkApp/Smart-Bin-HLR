import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lookupQR } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const lastScanned = useRef<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      lastScanned.current = null;
      setCameraKey((k) => k + 1);
    }, [])
  );

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || data === lastScanned.current) return;
    lastScanned.current = data;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const match = lookupQR(data);
    if (match) {
      router.push(`/${match.type}/${match.id}`);
    } else {
      router.push({ pathname: "/scan-result", params: { qr: data } });
    }
  }

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a", paddingTop: topPad }]}>
        <View style={styles.webMessage}>
          <View style={[styles.webIcon, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={32} color="#fff" />
          </View>
          <Text style={styles.webTitle}>QR Scanner</Text>
          <Text style={styles.webSubtitle}>
            Use the Expo Go app on your phone to scan QR codes with your camera.
          </Text>
        </View>
      </View>
    );
  }

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: "#0a0a0a" }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: "#0a0a0a", paddingTop: topPad }]}>
        <View style={styles.webMessage}>
          <View style={[styles.webIcon, { backgroundColor: colors.primary }]}>
            <Feather name="camera-off" size={32} color="#fff" />
          </View>
          <Text style={styles.webTitle}>Camera Access Needed</Text>
          <Text style={styles.webSubtitle}>Allow camera access to scan QR codes on your bins and locations.</Text>
          <TouchableOpacity
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0a" }]}>
      <CameraView
        key={cameraKey}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: topPad + 12 }]}>
        <Text style={styles.scanTitle}>Scan QR Code</Text>
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 90 }]}>
        <Text style={styles.scanHint}>
          {scanned ? "✓ QR Code detected!" : "Point your camera at a QR code"}
        </Text>
      </View>
    </View>
  );
}

const CORNER = 24;
const FRAME_SIZE = 240;

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { alignItems: "center", paddingHorizontal: 16 },
  scanTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, position: "relative" },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#fff", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 4 },
  bottom: { alignItems: "center", paddingHorizontal: 32 },
  scanHint: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  webMessage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  webIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  webTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  webSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  permBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  permBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
