import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/revenuecat";
import { useApp, type Group } from "@/context/AppContext";
import type { Plan } from "@/lib/revenuecat";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { plan, devPlanOverride, setDevPlanOverride } = useSubscription();
  const { groups, activeGroupId, activeGroup, setActiveGroupId, addGroup, deleteGroup } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Group["type"]>("family");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleAddGroup() {
    if (!newName.trim()) return;
    const g = addGroup(newName.trim(), newType);
    setActiveGroupId(g.id);
    setNewName("");
    setShowAdd(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDeleteGroup(id: string) {
    if (groups.length <= 1) {
      Alert.alert("Cannot Delete", "You need at least one group.");
      return;
    }
    Alert.alert("Delete Group", "This will delete all data in this group. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteGroup(id);
          if (activeGroupId === id) {
            setActiveGroupId(groups.find((g) => g.id !== id)!.id);
          }
        },
      },
    ]);
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  const planLabel: Record<string, string> = {
    free: "Free",
    lite: "Lite · $1.49/mo",
    pro: "Pro · $2.99/mo",
  };
  const planColor: Record<string, string> = {
    free: colors.mutedForeground,
    lite: "#F59E0B",
    pro: colors.primary,
  };

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.email ?? "User";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: insets.bottom + 80 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      {/* Account */}
      <SectionHeader title="Account" colors={colors} />
      <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initials || "U"}</Text>
          )}
        </View>
        <View style={styles.accountInfo}>
          <Text style={[styles.accountName, { color: colors.foreground }]}>{displayName}</Text>
          {user?.email ? (
            <Text style={[styles.accountEmail, { color: colors.mutedForeground }]}>
              {user.email}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* Subscription */}
      <SectionHeader title="Subscription" colors={colors} />
      <TouchableOpacity
        style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/paywall")}
        activeOpacity={0.8}
      >
        <View style={styles.planLeft}>
          <View style={[styles.planBadge, { backgroundColor: (planColor[plan] ?? colors.mutedForeground) + "20" }]}>
            <Text style={[styles.planBadgeText, { color: planColor[plan] ?? colors.mutedForeground }]}>
              {plan.toUpperCase()}
            </Text>
          </View>
          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: colors.foreground }]}>
              {planLabel[plan] ?? plan}
            </Text>
            <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>
              {plan === "free"
                ? "Unlimited items · Local only"
                : plan === "lite"
                  ? "Up to 100 items · Cloud sync"
                  : "Up to 5,000 items · Cloud sync"}
            </Text>
          </View>
        </View>
        {plan === "free" ? (
          <View style={[styles.upgradeChip, { backgroundColor: colors.primary }]}>
            <Text style={styles.upgradeChipText}>Upgrade</Text>
          </View>
        ) : (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        )}
      </TouchableOpacity>

      {/* Active Group */}
      <SectionHeader title="Active Group" colors={colors} />
      {activeGroup && (
        <View
          style={[
            styles.activeCard,
            { backgroundColor: `${colors.primary}15`, borderColor: colors.primary },
          ]}
        >
          <View style={[styles.groupIcon, { backgroundColor: colors.primary }]}>
            <Feather
              name={activeGroup.type === "family" ? "home" : "briefcase"}
              size={18}
              color="#fff"
            />
          </View>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{activeGroup.name}</Text>
            <Text style={[styles.groupType, { color: colors.primary }]}>
              {activeGroup.type === "family" ? "Family" : "Business"} · {activeGroup.role}
            </Text>
          </View>
        </View>
      )}

      {/* Switch Group */}
      <SectionHeader title="Switch Group" colors={colors} />
      {groups.map((g) => (
        <TouchableOpacity
          key={g.id}
          style={[styles.groupRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            setActiveGroupId(g.id);
            Haptics.selectionAsync();
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.groupIcon,
              { backgroundColor: g.id === activeGroupId ? colors.primary : colors.muted },
            ]}
          >
            <Feather
              name={g.type === "family" ? "home" : "briefcase"}
              size={16}
              color={g.id === activeGroupId ? "#fff" : colors.mutedForeground}
            />
          </View>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{g.name}</Text>
            <Text style={[styles.groupType, { color: colors.mutedForeground }]}>
              {g.type === "family" ? "Family" : "Business"}
            </Text>
          </View>
          {g.id === activeGroupId ? (
            <Feather name="check" size={18} color={colors.primary} />
          ) : (
            <TouchableOpacity
              onPress={() => handleDeleteGroup(g.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}

      {showAdd ? (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Group name"
            placeholderTextColor={colors.mutedForeground}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <View style={styles.typeRow}>
            {(["family", "business"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  {
                    borderColor: newType === t ? colors.primary : colors.border,
                    backgroundColor: newType === t ? `${colors.primary}15` : colors.background,
                  },
                ]}
                onPress={() => setNewType(t)}
              >
                <Feather
                  name={t === "family" ? "home" : "briefcase"}
                  size={14}
                  color={newType === t ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: newType === t ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {t === "family" ? "Family" : "Business"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formBtns}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowAdd(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddGroup}
            >
              <Text style={styles.saveBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addGroupBtn, { borderColor: colors.primary }]}
          onPress={() => setShowAdd(true)}
        >
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addGroupText, { color: colors.primary }]}>Add New Group</Text>
        </TouchableOpacity>
      )}

      {/* Dev Tools — only visible in development builds */}
      {__DEV__ && (
        <>
          <SectionHeader title="Developer Tools" colors={colors} />
          <View style={[styles.devCard, { backgroundColor: "#1a1a2e", borderColor: "#7c3aed" }]}>
            <View style={styles.devHeader}>
              <Feather name="code" size={14} color="#a78bfa" />
              <Text style={styles.devTitle}>Plan Override</Text>
              {devPlanOverride !== null && (
                <TouchableOpacity onPress={() => setDevPlanOverride(null)} style={styles.devClearBtn}>
                  <Text style={styles.devClearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.devSubtitle}>
              Active: <Text style={{ color: "#a78bfa", fontFamily: "Inter_600SemiBold" }}>
                {plan.toUpperCase()}{devPlanOverride !== null ? " (override)" : " (RevenueCat)"}
              </Text>
            </Text>
            <View style={styles.devBtnRow}>
              {(["free", "lite", "pro"] as Plan[]).map((p) => {
                const isActive = devPlanOverride === p || (devPlanOverride === null && plan === p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.devPlanBtn,
                      { borderColor: isActive ? "#7c3aed" : "#374151", backgroundColor: isActive ? "#7c3aed" : "#111827" },
                    ]}
                    onPress={() => {
                      setDevPlanOverride(p);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[styles.devPlanBtnText, { color: isActive ? "#fff" : "#9ca3af" }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* App info */}
      <SectionHeader title="App" colors={colors} />
      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.appName, { color: colors.foreground }]}>Smart Bin</Text>
        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>
          Find My Things · v1.0
        </Text>
        <Text
          style={[styles.appTagline, { color: colors.mutedForeground }]}
        >
          A personal search engine for your physical belongings.
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
  accountCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  accountEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  logoutBtn: { padding: 4 },
  planCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  upgradeChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  upgradeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  activeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  groupType: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  addGroupBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  addGroupText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  addForm: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12, marginTop: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formBtns: { flexDirection: "row", gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  appName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  appVersion: { fontSize: 12, fontFamily: "Inter_400Regular" },
  appTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  devCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  devHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  devTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#a78bfa",
  },
  devClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#374151",
  },
  devClearText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#9ca3af",
  },
  devSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
  },
  devBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  devPlanBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 8,
    alignItems: "center",
  },
  devPlanBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
