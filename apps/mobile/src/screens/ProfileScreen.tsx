import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'
import { useUiStore } from '../store/ui.store'

type Nav = StackNavigationProp<RootStackParamList>

export function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const nav = useNavigation<Nav>()
  const darkMode = useUiStore((s) => s.darkMode)

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ])
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, darkMode && styles.centerDark]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>👤</Text>
        <Text style={[styles.heading, darkMode && styles.textPrimaryDark]}>Mon compte</Text>
        <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nav.navigate('Register')} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.containerDark]}>
      {/* Avatar et nom */}
      <View style={[styles.userCard, darkMode && styles.userCardDark]}>
        <View style={[styles.avatar, darkMode && styles.avatarDark]}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, darkMode && styles.textPrimaryDark]}>{user?.first_name} {user?.last_name}</Text>
          <Text style={[styles.userEmail, darkMode && styles.textSecondaryDark]}>{user?.email}</Text>
          <View style={[styles.roleBadge, darkMode && styles.roleBadgeDark]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: darkMode ? '#86EFAC' : '#5BAE6A' }}>
              {user?.role === 'PRODUCER' ? '🌾 Producteur' : '🛒 Consommateur'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={[styles.section, darkMode && styles.sectionDark]}>
        <TouchableOpacity onPress={() => nav.navigate('Messages')} style={styles.menuItem}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={[styles.menuLabel, darkMode && styles.textPrimaryDark]}>Mes messages</Text>
          <Text style={[styles.chevron, darkMode && styles.textSecondaryDark]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={[styles.menuLabel, darkMode && styles.textPrimaryDark]}>Paramètres du compte</Text>
          <Text style={[styles.chevron, darkMode && styles.textSecondaryDark]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={[styles.menuLabel, darkMode && styles.textPrimaryDark]}>Confidentialité & RGPD</Text>
          <Text style={[styles.chevron, darkMode && styles.textSecondaryDark]}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 16 }}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  heading:        { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 24 },
  primaryBtn:     { backgroundColor: '#5BAE6A', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn:     { borderWidth: 2, borderColor: '#5BAE6A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40 },
  outlineBtnText: { color: '#5BAE6A', fontWeight: '700', fontSize: 16 },
  userCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E2EEE2' },
  avatar:         { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EBF8F0', justifyContent: 'center', alignItems: 'center' },
  userName:       { fontSize: 18, fontWeight: '700', color: '#333' },
  userEmail:      { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  roleBadge:      { backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  section:        { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E2EEE2', overflow: 'hidden', marginBottom: 20 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2EEE2' },
  menuIcon:       { fontSize: 20, marginRight: 12 },
  menuLabel:      { flex: 1, fontSize: 15, color: '#333' },
  chevron:        { fontSize: 20, color: '#9CA3AF' },
  logoutBtn:      { backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F6F9F6', padding: 20 },
  containerDark: { backgroundColor: '#0B1220' },
  centerDark: { backgroundColor: '#0B1220' },
  userCardDark: { backgroundColor: '#111827', borderColor: '#374151' },
  avatarDark: { backgroundColor: '#0F172A' },
  roleBadgeDark: { backgroundColor: '#1B3A2C' },
  sectionDark: { backgroundColor: '#111827', borderColor: '#374151' },
  textPrimaryDark: { color: '#F3F4F6' },
  textSecondaryDark: { color: '#9CA3AF' },
})
