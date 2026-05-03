import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPhoto: (uri: string) => void;
}

export function PhotoSourceSheet({ visible, onClose, onPhoto }: Props) {
  const colors = useColors();

  async function fromCamera() {
    onClose();
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      onPhoto(result.assets[0].uri);
    }
  }

  async function fromGallery() {
    onClose();
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      onPhoto(result.assets[0].uri);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.card }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Add Photo</Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={fromCamera}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Feather name="camera" size={22} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>Take Photo</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                Use your camera to snap a new photo
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: colors.border }]}
            onPress={fromGallery}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: "#8B5CF615" }]}>
              <Feather name="image" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>Choose from Library</Text>
              <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                Pick an existing photo from your gallery
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
