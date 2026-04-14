import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'

type Nav = StackNavigationProp<RootStackParamList>

export function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const nav = useNavigation<Nav>()

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ])
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>👤</Text>
        <Text style={styles.heading}>Mon compte</Text>
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
    <View style={{ flex: 1, backgroundColor: '#F6F9F6', padding: 20 }}>
      {/* Avatar et nom */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 32 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#5BAE6A' }}>
              {user?.role === 'PRODUCER' ? '🌾 Producteur' : '🛒 Consommateur'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => nav.navigate('Messages')} style={styles.menuItem}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuLabel}>Mes messages</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuLabel}>Paramètres du compte</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuLabel}>Confidentialité & RGPD</Text>
          <Text style={styles.chevron}>›</Text>
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
})
