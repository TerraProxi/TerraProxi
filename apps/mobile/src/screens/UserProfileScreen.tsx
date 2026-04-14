import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, FlatList, Switch, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Radius, Spacing } from '../theme'
import { useAuthStore } from '../store/auth.store'
import api from '../services/api'

type Nav = StackNavigationProp<RootStackParamList>

interface MenuItem {
  id: string
  label: string
  icon: string
  iconColor: string
  iconBg: string
  section: string
  badge?: string
  hasToggle?: boolean
}

interface ProfileData {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'CONSUMER' | 'PRODUCER' | 'ADMIN'
  order_count: number
  favorite_count: number
  review_count: number
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'orders', label: 'Mes commandes', icon: 'shopping-bag', iconColor: Colors.blue500, iconBg: Colors.blue50, section: 'Mon Compte', badge: '3' },
  { id: 'favorites', label: 'Mes favoris', icon: 'heart', iconColor: Colors.red500, iconBg: Colors.red50, section: 'Mon Compte' },
  { id: 'cart', label: 'Mon panier', icon: 'cart', iconColor: Colors.primary, iconBg: Colors.green50, section: 'Mon Compte' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', iconColor: Colors.warning, iconBg: Colors.yellow50, section: 'Préférences', badge: '5' },
  { id: 'location', label: 'Localisation', icon: 'map-marker', iconColor: Colors.blue500, iconBg: Colors.blue50, section: 'Préférences' },
  { id: 'darkMode', label: 'Mode sombre', icon: 'weather-night', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Préférences', hasToggle: true },
  { id: 'help', label: 'Aide', icon: 'help-circle', iconColor: Colors.accent, iconBg: '#E0F7FA', section: 'Support' },
  { id: 'report', label: 'Signaler', icon: 'flag', iconColor: Colors.danger, iconBg: Colors.red50, section: 'Support' },
  { id: 'terms', label: 'Conditions', icon: 'file-document', iconColor: Colors.gray600, iconBg: Colors.gray100, section: 'Support' },
]

const SECTION_ORDER = ['Mon Compte', 'Préférences', 'Support']
const SECTION_ICONS: Record<string, string> = { 'Mon Compte': 'account', 'Préférences': 'tune', 'Support': 'lifebuoy' }

export function UserProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const nav = useNavigation<Nav>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    setProfileLoading(true)
    api.get<ProfileData>('/users/profile')
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginIconWrap}>
          <MaterialCommunityIcons name="account-circle" size={64} color={Colors.gray300} />
        </View>
        <Text style={styles.loginTitle}>Mon compte</Text>
        <Text style={styles.loginSub}>Connectez-vous pour accéder à votre profil</Text>
        <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.loginBtn}>
          <Text style={styles.loginBtnText}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nav.navigate('Register')} style={styles.registerBtn}>
          <Text style={styles.registerBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : (user ? `${user.first_name} ${user.last_name}` : '')
  const initials = profile ? `${profile.first_name[0]}${profile.last_name[0]}` : (user ? `${user.first_name?.[0]}${user.last_name?.[0]}` : '')
  const role = profile?.role ?? user?.role ?? 'CONSUMER'

  const groupedItems = SECTION_ORDER.map((section) => ({
    section,
    data: MENU_ITEMS.filter((i) => i.section === section),
  }))

  const sections: Array<{ key: string; type: 'header' | 'item'; section?: string; item?: MenuItem }> = []
  for (const group of groupedItems) {
    sections.push({ key: `h-${group.section}`, type: 'header', section: group.section })
    for (const item of group.data) {
      sections.push({ key: item.id, type: 'item', item })
    }
  }

  const renderHeader = (section: string) => (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={(SECTION_ICONS[section] || 'circle') as any} size={18} color={Colors.gray600} />
      <Text style={styles.sectionTitle}>{section}</Text>
    </View>
  )

  const renderItem = (item: MenuItem) => (
    <TouchableOpacity style={styles.menuRow} activeOpacity={0.6}>
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <MaterialCommunityIcons name={item.icon as any} size={20} color={item.iconColor} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      {item.hasToggle ? (
        <Switch value={false} trackColor={{ false: Colors.gray300, true: Colors.primary }} thumbColor={Colors.white} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.gray400} />
      )}
    </TouchableOpacity>
  )

  return (
    <FlatList
      data={sections}
      keyExtractor={(s) => s.key}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity style={styles.avatarEdit}>
              <MaterialCommunityIcons name="pencil" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {role === 'PRODUCER' ? 'Producteur' : 'Consommateur'}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profileLoading ? '–' : (profile?.order_count ?? '–')}</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profileLoading ? '–' : (profile?.favorite_count ?? '–')}</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profileLoading ? '–' : (profile?.review_count ?? '–')}</Text>
              <Text style={styles.statLabel}>Avis</Text>
            </View>
          </View>
        </View>
      }
      renderItem={({ item }) =>
        item.type === 'header'
          ? renderHeader(item.section!)
          : renderItem(item.item!)
      }
      ListFooterComponent={
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      }
    />
  )
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray50, padding: 32 },
  loginIconWrap: { marginBottom: 16 },
  loginTitle: { fontSize: 24, fontWeight: '700', color: Colors.dark, marginBottom: 8 },
  loginSub: { fontSize: 14, color: Colors.gray600, marginBottom: 24, textAlign: 'center' },
  loginBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 48, marginBottom: 12, width: '100%', alignItems: 'center' },
  loginBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  registerBtn: { borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 48, width: '100%', alignItems: 'center' },
  registerBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 16 },
  profileHeader: {
    backgroundColor: Colors.white, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl,
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: -4,
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.white,
  },
  userName: { fontSize: 22, fontWeight: '700', color: Colors.dark, marginBottom: 6 },
  roleBadge: {
    backgroundColor: Colors.green100, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 20,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.green700 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.dark },
  statLabel: { fontSize: 12, color: Colors.gray600, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.gray200 },
  listContent: { paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, marginHorizontal: 20, marginBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.gray600, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  menuIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.dark },
  badge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 4,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24, backgroundColor: Colors.red50,
    borderRadius: Radius.md, paddingVertical: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
})
