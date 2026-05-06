import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { useApp, type Group, type GroupMember } from "@/context/AppContext";
import { apiFetch } from "@/lib/apiClient";
import type { Plan } from "@/lib/revenuecat";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { plan, devPlanOverride, setDevPlanOverride } = useSubscription();
  const { groups, activeGroupId, activeGroup, setActiveGroupId, addGroup, deleteGroup, joinGroup } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Group["type"]>("family");

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isAdmin = activeGroup?.role === "admin";

  useEffect(() => {
    if (activeGroupId) loadMembers();
  }, [activeGroupId]);

  async function loadMembers() {
    if (!activeGroupId) return;
    setLoadingMembers(true);
    try {
      const { members: m } = await apiFetch<{ members: GroupMember[] }>(
        `/groups/${activeGroupId}/members`,
      );
      setMembers(m);
    } catch {
      // silently fail
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleGetInvite() {
    if (!activeGroupId) return;
    setInviteLoading(true);
    try {
      const { inviteCode: code } = await apiFetch<{ inviteCode: string }>(
        `/groups/${activeGroupId}/invite`,
      );
      setInviteCode(code);
      setShowInviteModal(true);
    } catch {
      Alert.alert("Error", "Could not get invite code.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRegenerateInvite() {
    if (!activeGroupId) return;
    try {
      const { inviteCode: code } = await apiFetch<{ inviteCode: string }>(
        `/groups/${activeGroupId}/invite/regenerate`,
        { method: "POST" },
      );
      setInviteCode(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not regenerate invite code.");
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!activeGroupId) return;
    Alert.alert("Remove Member", `Remove ${memberName} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/groups/${activeGroupId}/members/${memberId}`, {
              method: "DELETE",
            });
            setMembers((prev) => prev.filter((m) => m.userId !== memberId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {
            Alert.alert("Error", "Could not remove member.");
          }
        },
      },
    ]);
  }

  async function handleJoinGroup() {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const g = await joinGroup(joinCode.trim().toUpperCase());
      setActiveGroupId(g.id);
      setShowJoinModal(false);
      setJoinCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Invalid Code", "No group found with that invite code.");
    } finally {
      setJoinLoading(false);
    }
  }

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

  function memberDisplayName(m: GroupMember) {
    const full = [m.firstName, m.lastName].filter(Boolean).join(" ");
    return full || m.email || "Unknown";
  }

  function memberInitials(m: GroupMember) {
    const name = memberDisplayName(m);
    return name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("");
  }

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
            <Text style={[styles.accountEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
            <Text style={[styles.planName, { color: colors.foreground }]}>{planLabel[plan] ?? plan}</Text>
            <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>
              {plan === "free" ? "Unlimited items · Local only" : plan === "lite" ? "Up to 100 items · Cloud sync" : "Up to 5,000 items · Cloud sync"}
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
        <View style={[styles.activeCard, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
          <View style={styles.activeCardTop}>
            <View style={[styles.groupIcon, { backgroundColor: colors.primary }]}>
              <Feather name={activeGroup.type === "family" ? "home" : "briefcase"} size={18} color="#fff" />
            </View>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: colors.foreground }]}>{activeGroup.name}</Text>
              <Text style={[styles.groupType, { color: colors.primary }]}>
                {activeGroup.type === "family" ? "Family" : "Business"} · {activeGroup.role === "admin" ? "Admin" : "Member"}
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
                onPress={handleGetInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="user-plus" size={13} color="#fff" />
                    <Text style={styles.inviteBtnText}>Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Members */}
      <SectionHeader title="Members" colors={colors} />
      <View style={[styles.membersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {loadingMembers ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />
        ) : members.length === 0 ? (
          <Text style={[styles.noMembersText, { color: colors.mutedForeground }]}>No members found</Text>
        ) : (
          members.map((m, idx) => {
            const name = memberDisplayName(m);
            const isMe = m.userId === user?.id;
            const canRemove = isAdmin && !isMe && m.role !== "admin";
            return (
              <View
                key={m.userId}
                style={[
                  styles.memberRow,
                  { borderBottomColor: colors.border },
                  idx === members.length - 1 && styles.memberRowLast,
                ]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: isMe ? colors.primary : colors.muted }]}>
                  {m.profileImageUrl ? (
                    <Image source={{ uri: m.profileImageUrl }} style={styles.memberAvatarImg} />
                  ) : (
                    <Text style={[styles.memberAvatarText, { color: isMe ? "#fff" : colors.mutedForeground }]}>
                      {memberInitials(m)}
                    </Text>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {name}{isMe ? " (you)" : ""}
                  </Text>
                  {m.email && !isMe ? (
                    <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{m.email}</Text>
                  ) : null}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: m.role === "admin" ? `${colors.primary}20` : `${colors.mutedForeground}15` }]}>
                  <Text style={[styles.roleBadgeText, { color: m.role === "admin" ? colors.primary : colors.mutedForeground }]}>
                    {m.role === "admin" ? "Admin" : "Member"}
                  </Text>
                </View>
                {canRemove ? (
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(m.userId, name)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Feather name="x" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </View>

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
          <View style={[styles.groupIcon, { backgroundColor: g.id === activeGroupId ? colors.primary : colors.muted }]}>
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
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
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
                style={[styles.typeBtn, { borderColor: newType === t ? colors.primary : colors.border, backgroundColor: newType === t ? `${colors.primary}15` : colors.background }]}
                onPress={() => setNewType(t)}
              >
                <Feather name={t === "family" ? "home" : "briefcase"} size={14} color={newType === t ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.typeBtnText, { color: newType === t ? colors.primary : colors.mutedForeground }]}>
                  {t === "family" ? "Family" : "Business"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formBtns}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowAdd(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAddGroup}>
              <Text style={styles.saveBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.groupActionRow}>
          <TouchableOpacity
            style={[styles.groupActionBtn, { borderColor: colors.primary, flex: 1 }]}
            onPress={() => setShowAdd(true)}
          >
            <Feather name="plus" size={15} color={colors.primary} />
            <Text style={[styles.groupActionText, { color: colors.primary }]}>New Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupActionBtn, { borderColor: colors.border, flex: 1 }]}
            onPress={() => setShowJoinModal(true)}
          >
            <Feather name="log-in" size={15} color={colors.mutedForeground} />
            <Text style={[styles.groupActionText, { color: colors.mutedForeground }]}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dev Tools */}
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
                    style={[styles.devPlanBtn, { borderColor: isActive ? "#7c3aed" : "#374151", backgroundColor: isActive ? "#7c3aed" : "#111827" }]}
                    onPress={() => { setDevPlanOverride(p); Haptics.selectionAsync(); }}
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
        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Find My Things · v1.0</Text>
        <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
          A personal search engine for your physical belongings.
        </Text>
      </View>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide" onRequestClose={() => setShowInviteModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInviteModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Invite to Group</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Share this code with someone to invite them to "{activeGroup?.name}"
            </Text>

            <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: colors.foreground }]} selectable>
                {inviteCode}
              </Text>
            </View>

            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={[styles.inviteActionBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(inviteCode);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Copied!", "Invite code copied to clipboard.");
                }}
              >
                <Feather name="copy" size={15} color="#fff" />
                <Text style={styles.inviteActionBtnText}>Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteActionBtn, { backgroundColor: colors.muted }]}
                onPress={handleRegenerateInvite}
              >
                <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
                <Text style={[styles.inviteActionBtnText, { color: colors.mutedForeground }]}>New Code</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.border }]}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Join Group Modal */}
      <Modal visible={showJoinModal} transparent animationType="slide" onRequestClose={() => setShowJoinModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowJoinModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Join a Group</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Enter the 8-character invite code shared with you
            </Text>

            <TextInput
              style={[styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. AB3X9Z2K"
              placeholderTextColor={colors.mutedForeground}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="go"
              onSubmitEditing={handleJoinGroup}
            />

            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: joinCode.length === 8 ? colors.primary : colors.muted }]}
              onPress={handleJoinGroup}
              disabled={joinCode.length !== 8 || joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.joinBtnText, { color: joinCode.length === 8 ? "#fff" : colors.mutedForeground }]}>
                  Join Group
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.border }]}
              onPress={() => { setShowJoinModal(false); setJoinCode(""); }}
            >
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
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
  sectionHeader: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },

  accountCard: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  accountEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  logoutBtn: { padding: 4 },

  planCard: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  upgradeChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  upgradeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  activeCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 4 },
  activeCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  inviteBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },

  membersCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  noMembersText: { padding: 16, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1 },
  memberRowLast: { borderBottomWidth: 0 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  memberAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  memberEmail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeBtn: { padding: 4, marginLeft: 2 },

  groupRow: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  groupIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  groupType: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  groupActionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  groupActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", padding: 13 },
  groupActionText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  addForm: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12, marginTop: 4 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, padding: 10 },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formBtns: { flexDirection: "row", gap: 8 },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  infoCard: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", gap: 4, marginTop: 4 },
  appName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  appVersion: { fontSize: 12, fontFamily: "Inter_400Regular" },
  appTagline: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, lineHeight: 18 },

  devCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 10 },
  devHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  devTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#a78bfa" },
  devClearBtn: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#374151" },
  devClearText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#9ca3af" },
  devSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6b7280" },
  devBtnRow: { flexDirection: "row", gap: 8 },
  devPlanBtn: { flex: 1, borderRadius: 8, borderWidth: 1.5, paddingVertical: 8, alignItems: "center" },
  devPlanBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  codeBox: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center" },
  codeText: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: 6 },
  inviteActions: { flexDirection: "row", gap: 8 },
  inviteActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 13 },
  inviteActionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  codeInput: { borderRadius: 12, borderWidth: 1.5, padding: 16, fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: 4, textAlign: "center" },
  joinBtn: { borderRadius: 12, padding: 14, alignItems: "center" },
  joinBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalCancel: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
