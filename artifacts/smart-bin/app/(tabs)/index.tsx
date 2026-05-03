import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
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
import { useApp, type SearchResult } from "@/context/AppContext";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { QRScanModal } from "@/components/QRScanModal";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { searchItems, getGroupItems, getGroupBins, getGroupLocations, activeGroup, lookupQR } = useApp();
  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const results: SearchResult[] = query.trim() ? searchItems(query) : [];
  const allItems = getGroupItems();
  const allBins = getGroupBins();
  const allLocations = getGroupLocations();
  const recentItems = [...allItems].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>
              {activeGroup?.name ?? "My Group"}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Find My Things</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/add-item")}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search items..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            onPress={() => setScanOpen(true)}
          >
            <Feather name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <QRScanModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(code) => {
          setScanOpen(false);
          const match = lookupQR(code);
          if (match) {
            router.push(`/${match.type}/${match.id}` as any);
          } else {
            router.push({ pathname: "/scan-result", params: { qr: code } });
          }
        }}
      />

      {query.trim() ? (
        results.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState icon="search" title={`No items matching "${query}"`} subtitle="Try a different search term" />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(r) => r.item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
            renderItem={({ item: r }) => (
              <ItemCard item={r.item} bin={r.bin} locationPath={r.locationPath} />
            )}
          />
        )
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsRow}>
            <StatCard icon="package" value={allItems.length} label="Items" color={colors.primary} bg={`${colors.primary}15`} />
            <StatCard icon="archive" value={allBins.length} label="Bins" color="#F59E0B" bg="#F59E0B15" />
            <StatCard icon="map-pin" value={allLocations.length} label="Locations" color="#8B5CF6" bg="#8B5CF615" />
          </View>

          {recentItems.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Items</Text>
              {recentItems.map((item) => {
                const [r] = searchItems(item.name).filter((x) => x.item.id === item.id);
                if (!r) return null;
                return <ItemCard key={item.id} item={r.item} bin={r.bin} locationPath={r.locationPath} />;
              })}
            </>
          )}

          {allItems.length === 0 && (
            <View style={styles.emptyHome}>
              <EmptyState
                icon="package"
                title="No items yet"
                subtitle="Tap + to add your first item, or add a location and bin first"
              />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ icon, value, label, color, bg }: { icon: keyof typeof Feather.glyphMap; value: number; label: string; color: string; bg: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  groupLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  scanBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", padding: 0 },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  empty: { flex: 1 },
  emptyHome: { marginTop: 40 },
});
