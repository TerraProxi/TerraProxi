import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, Switch, StyleSheet, Alert, Linking, Image, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Fonts, MIN_TOUCH_TARGET, Radius, Spacing } from '../theme'
import { useAuthStore, type User } from '../store/auth.store'
import { useFavoritesStore } from '../store/favorites.store'
import { useUiStore } from '../store/ui.store'
import { useUnreadStore } from '../store/unread.store'
import { useNotificationsStore } from '../store/notifications.store'
import api, { apiErrorMessage } from '../services/api'
import { shareMyDataExport } from '../services/dataExport'
import { pickAndUploadAvatar } from '../services/avatar'
import { WEB_URL } from '../config'
import { IconButton, type IconName } from '../components/IconButton'
import { PrimaryButton } from '../components/PrimaryButton'

type Nav = StackNavigationProp<RootStackParamList>

type ToggleId = 'darkMode' | 'newsletter'
type MenuId =
  | 'orders' | 'notifications' | 'messages' | 'favorites' | 'cart'
  | 'editProfile' | 'email' | 'password' | ToggleId
  | 'export' | 'privacy' | 'deleteAccount'

const isToggle = (id: MenuId): id is ToggleId => id === 'darkMode' || id === 'newsletter'

interface MenuItem {
  id: MenuId
  label: string
  icon: IconName
  iconColor: string
  iconBg: string
  section: string
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'orders', label: 'Mes commandes', icon: 'shopping-outline', iconColor: Colors.blue600, iconBg: Colors.blue50, section: 'Mon activité' },
  { id: 'notifications', label: 'Notifications', icon: 'bell-outline', iconColor: Colors.primaryDark, iconBg: Colors.green50, section: 'Mon activité' },
  { id: 'messages', label: 'Messages', icon: 'chat-outline', iconColor: Colors.primaryDark, iconBg: Colors.green50, section: 'Mon activité' },
  { id: 'favorites', label: 'Mes favoris', icon: 'heart', iconColor: Colors.danger, iconBg: Colors.red50, section: 'Mon activité' },
  { id: 'cart', label: 'Mon panier', icon: 'cart', iconColor: Colors.primaryDark, iconBg: Colors.green50, section: 'Mon activité' },
  { id: 'editProfile', label: 'Modifier mon profil', icon: 'account-edit', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Mon compte' },
  { id: 'email', label: 'Adresse email', icon: 'email-outline', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Mon compte' },
  { id: 'password', label: 'Mot de passe', icon: 'lock-outline', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Mon compte' },
  { id: 'newsletter', label: 'Recevoir les newsletters des producteurs', icon: 'email-newsletter', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Mon compte' },
  { id: 'darkMode', label: 'Mode sombre', icon: 'weather-night', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Mon compte' },
  { id: 'export', label: 'Exporter mes données', icon: 'download', iconColor: Colors.accentDark, iconBg: '#E0F7FA', section: 'Confidentialité' },
  { id: 'privacy', label: 'Politique de confidentialité', icon: 'file-document', iconColor: Colors.gray700, iconBg: Colors.gray100, section: 'Confidentialité' },
  { id: 'deleteAccount', label: 'Supprimer mon compte', icon: 'account-remove', iconColor: Colors.danger, iconBg: Colors.red50, section: 'Confidentialité' },
]

const SECTION_ORDER = ['Mon activité', 'Mon compte', 'Confidentialité']
const ORDER_COUNT_LIMIT = 100

type Row = { key: string; section: string; item?: MenuItem }

const ROWS: Row[] = SECTION_ORDER.flatMap((section) => [
  { key: `h-${section}`, section },
  ...MENU_ITEMS.filter((i) => i.section === section).map((item) => ({ key: item.id, section, item })),
])

export function UserProfileScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const nav = useNavigation<Nav>()
  const isDark = useUiStore((s) => s.darkMode)
  const setDarkMode = useUiStore((s) => s.setDarkMode)
  const favoriteCount = useFavoritesStore((s) => s.producerIds.length + s.productIds.length)
  const unreadCount = useUnreadStore((s) => s.count)
  const refreshUnread = useUnreadStore((s) => s.refresh)
  const unreadNotifications = useNotificationsStore((s) => s.unreadCount)
  const refreshNotifications = useNotificationsStore((s) => s.refresh)
  const setUser = useAuthStore((s) => s.setUser)
  const [isSavingNewsletter, setSavingNewsletter] = useState(false)
  const [isUploadingAvatar, setUploadingAvatar] = useState(false)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [isExporting, setExporting] = useState(false)

  // Statistiques et badge à jour à chaque retour sur l'onglet
  useFocusEffect(useCallback(() => {
    if (!isAuthenticated) return
    void refreshUnread()
    void refreshNotifications()
    api.get<unknown[]>('/orders', { params: { limit: ORDER_COUNT_LIMIT } })
      .then(({ data }) => setOrderCount(data.length))
      .catch(() => setOrderCount(null))
  }, [isAuthenticated, refreshUnread, refreshNotifications]))

  if (!isAuthenticated) {
    return (
      <View style={[styles.loginContainer, isDark && styles.loginContainerDark]}>
        <MaterialCommunityIcons name="account-circle" size={64} color={Colors.gray400} />
        <Text style={[styles.loginTitle, isDark && styles.textPrimaryDark]} accessibilityRole="header">Mon compte</Text>
        <Text style={[styles.loginSub, isDark && styles.textSecondaryDark]}>Connectez-vous pour accéder à votre profil</Text>
        <PrimaryButton label="Se connecter" onPress={() => nav.navigate('Login')} style={styles.loginBtn} />
        <PrimaryButton label="Créer un compte" variant="outline" onPress={() => nav.navigate('Register')} style={styles.loginBtn} />
      </View>
    )
  }

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Vos messages seront effacés. Vos commandes passées sont conservées de façon anonyme pour la comptabilité.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteAccount().catch((err) => Alert.alert('Erreur', apiErrorMessage(err)))
          },
        },
      ],
    )
  }

  const exportData = async () => {
    setExporting(true)
    try {
      await shareMyDataExport()
    } catch (err) {
      Alert.alert('Export impossible', apiErrorMessage(err, 'Vos données n\'ont pas pu être exportées'))
    } finally {
      setExporting(false)
    }
  }

  const setNewsletterOptIn = async (isOptedIn: boolean) => {
    setSavingNewsletter(true)
    try {
      const { data } = await api.patch<User>('/users/profile', { newsletter_opt_in: isOptedIn })
      setUser(data)
    } catch (err) {
      Alert.alert('Préférence non enregistrée', apiErrorMessage(err))
    } finally {
      setSavingNewsletter(false)
    }
  }

  const changeAvatar = async () => {
    setUploadingAvatar(true)
    try {
      const updated = await pickAndUploadAvatar()
      if (updated) setUser(updated)
    } catch (err) {
      Alert.alert('Photo non enregistrée', apiErrorMessage(err, 'La photo n\'a pas pu être envoyée'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const TOGGLES: Record<ToggleId, { value: boolean; onChange: (value: boolean) => void; disabled: boolean }> = {
    darkMode: { value: isDark, onChange: setDarkMode, disabled: false },
    newsletter: {
      value: user?.newsletter_opt_in ?? false,
      onChange: (value) => void setNewsletterOptIn(value),
      disabled: isSavingNewsletter,
    },
  }

  const MENU_ACTIONS: Record<Exclude<MenuId, ToggleId>, () => void> = {
    orders: () => nav.navigate('Orders'),
    notifications: () => nav.navigate('Notifications'),
    messages: () => nav.navigate('Messages'),
    favorites: () => nav.navigate('Favorites'),
    cart: () => nav.navigate('Cart'),
    editProfile: () => nav.navigate('EditProfile'),
    email: () => nav.navigate('ChangeEmail'),
    password: () => nav.navigate('ChangePassword'),
    export: () => { if (!isExporting) void exportData() },
    privacy: () => {
      Linking.openURL(`${WEB_URL}/privacy`).catch(() => Alert.alert('Navigateur indisponible', `${WEB_URL}/privacy`))
    },
    deleteAccount: confirmDeleteAccount,
  }

  const renderItem = (item: MenuItem) => {
    const counts: Partial<Record<MenuId, number>> = { messages: unreadCount, notifications: unreadNotifications }
    const count = counts[item.id] ?? 0
    const badge = count > 0 ? count : null
    const content = (
      <>
        <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
          <MaterialCommunityIcons name={item.icon} size={20} color={item.iconColor} />
        </View>
        <Text style={[styles.menuLabel, isDark && styles.textPrimaryDark]}>
          {item.id === 'export' && isExporting ? 'Préparation de l\'export…' : item.label}
        </Text>
        {badge !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </>
    )

    if (isToggle(item.id)) {
      const toggle = TOGGLES[item.id]
      return (
        <View style={[styles.menuRow, isDark && styles.menuRowDark]}>
          {content}
          <Switch
            value={toggle.value}
            onValueChange={toggle.onChange}
            disabled={toggle.disabled}
            trackColor={{ false: Colors.gray300, true: Colors.primaryDark }}
            thumbColor={Colors.white}
            accessibilityLabel={item.label}
          />
        </View>
      )
    }
    return (
      <TouchableOpacity
        style={[styles.menuRow, isDark && styles.menuRowDark]}
        activeOpacity={0.6}
        onPress={MENU_ACTIONS[item.id]}
        accessibilityRole="button"
        accessibilityLabel={badge !== null ? `${item.label}, ${badge} non lu${badge > 1 ? 's' : ''}` : item.label}
      >
        {content}
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.gray600} />
      </TouchableOpacity>
    )
  }

  const firstName = user?.first_name ?? ''
  const lastName = user?.last_name ?? ''
  const displayName = `${firstName} ${lastName}`.trim() || 'Mon compte'
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const orderCountLabel = orderCount === null ? '–' : orderCount >= ORDER_COUNT_LIMIT ? `${ORDER_COUNT_LIMIT}+` : String(orderCount)

  return (
    <FlatList
      data={ROWS}
      keyExtractor={(row) => row.key}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={[styles.profileHeader, { paddingTop: insets.top + Spacing.lg }, isDark && styles.profileHeaderDark]}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              style={[styles.avatar, isDark && styles.avatarDark]}
              onPress={() => void changeAvatar()}
              disabled={isUploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Changer la photo de profil"
              accessibilityState={{ busy: isUploadingAvatar }}
            >
              {isUploadingAvatar && <ActivityIndicator color={Colors.primaryDark} />}
              {!isUploadingAvatar && user?.avatar_url && (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} accessibilityIgnoresInvertColors />
              )}
              {!isUploadingAvatar && !user?.avatar_url && <Text style={styles.avatarText}>{initials}</Text>}
            </TouchableOpacity>
            <IconButton
              icon="pencil"
              label="Modifier mon profil"
              onPress={() => nav.navigate('EditProfile')}
              color={Colors.white}
              size={16}
              style={styles.avatarEdit}
            />
          </View>
          <Text style={[styles.userName, isDark && styles.textPrimaryDark]} accessibilityRole="header">{displayName}</Text>
          <Text style={[styles.userEmail, isDark && styles.textSecondaryDark]}>{user?.email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat} accessible accessibilityLabel={`${orderCountLabel} commandes`}>
              <Text style={[styles.statValue, isDark && styles.textPrimaryDark]}>{orderCountLabel}</Text>
              <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Commandes</Text>
            </View>
            <View style={[styles.statDivider, isDark && styles.statDividerDark]} />
            <View style={styles.stat} accessible accessibilityLabel={`${favoriteCount} favoris`}>
              <Text style={[styles.statValue, isDark && styles.textPrimaryDark]}>{favoriteCount}</Text>
              <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Favoris</Text>
            </View>
          </View>
        </View>
      }
      renderItem={({ item: row }) => (row.item ? renderItem(row.item) : (
        <Text style={styles.sectionTitle} accessibilityRole="header">{row.section}</Text>
      ))}
      ListFooterComponent={
        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn} accessibilityRole="button">
          <MaterialCommunityIcons name="logout" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray50, padding: 32 },
  loginTitle: { fontSize: 24, fontFamily: Fonts.title, color: Colors.dark, marginTop: 16, marginBottom: 8 },
  loginSub: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.gray700, marginBottom: 24, textAlign: 'center' },
  loginBtn: { alignSelf: 'stretch', marginBottom: 12 },
  profileHeader: {
    backgroundColor: Colors.white, borderBottomLeftRadius: Radius.xxl, borderBottomRightRadius: Radius.xxl,
    paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', elevation: 3,
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 28, fontFamily: Fonts.title, color: Colors.primaryDark },
  avatarEdit: {
    position: 'absolute', bottom: -8, right: -14,
    borderRadius: 22, backgroundColor: Colors.primaryDark,
    borderWidth: 3, borderColor: Colors.white,
  },
  userName: { fontSize: 22, fontFamily: Fonts.title, color: Colors.dark, marginBottom: 2 },
  userEmail: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.gray700, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: Fonts.title, color: Colors.dark },
  statLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray700, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.gray200 },
  listContent: { paddingBottom: 40 },
  sectionTitle: {
    fontSize: 14, fontFamily: Fonts.bold, color: Colors.gray700, textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginHorizontal: 20, marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH_TARGET + 12,
    backgroundColor: Colors.white, paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  menuIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: Fonts.medium, color: Colors.dark },
  badge: {
    backgroundColor: Colors.primaryDark, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 4,
  },
  badgeText: { color: Colors.white, fontSize: 12, fontFamily: Fonts.bold },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24, backgroundColor: Colors.red50,
    borderRadius: Radius.md, minHeight: MIN_TOUCH_TARGET + 8,
  },
  logoutText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.danger },
  loginContainerDark: { backgroundColor: '#0B1220' },
  profileHeaderDark: { backgroundColor: '#111827' },
  avatarDark: { backgroundColor: Colors.gray900 },
  menuRowDark: { backgroundColor: '#111827', borderBottomColor: Colors.gray900 },
  statDividerDark: { backgroundColor: Colors.gray900 },
  textPrimaryDark: { color: Colors.gray100 },
  textSecondaryDark: { color: Colors.gray500 },
})
