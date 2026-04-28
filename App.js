import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, useIsFocused } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createClient } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Users, BedDouble, Bath, WifiOff, CalendarDays, Info, Settings, BookOpen } from 'lucide-react-native';

// --- 1. SUPABASE INITIALIZATION ---
const supabaseUrl = 'https://tcgipznsthsfpvgcdswz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZ2lwem5zdGhzZnB2Z2Nkc3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM3NDAxNCwiZXhwIjoyMDkyOTUwMDE0fQ.8YPAD_4_SG0IWcl_7OfEbQ0EKl4Eu7mTSYkdwwDTZxA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. THEME CONTEXT & STYLES ---
const ThemeContext = createContext();

const themes = {
  dark: { mode: 'dark', bg: '#0f0f11', card: '#1a1a1d', text: '#ffffff', textMuted: '#a0a0a0', primary: '#d4af37', border: '#333333', danger: '#ff4444', success: '#4CAF50' },
  light: { mode: 'light', bg: '#f5f5f7', card: '#ffffff', text: '#1c1c1e', textMuted: '#636366', primary: '#b8860b', border: '#e5e5ea', danger: '#ff3b30', success: '#34c759' }
};

// Dynamic Stylesheet Generator
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  authContainer: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 25 },
  appTitle: { fontSize: 34, color: theme.primary, textAlign: 'center', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  authSubtitle: { fontSize: 16, color: theme.textMuted, textAlign: 'center', marginBottom: 40, textTransform: 'uppercase', letterSpacing: 3 },
  authCard: { backgroundColor: theme.card, padding: 25, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  switchAuthText: { color: theme.textMuted, textAlign: 'center', fontSize: 14, textDecorationLine: 'underline' },
  input: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text, padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 16 },
  primaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: theme.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 },
  card: { backgroundColor: theme.card, borderRadius: 8, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: theme.border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  roomImage: { width: '100%', height: 220, borderBottomWidth: 1, borderBottomColor: theme.primary },
  cardInfo: { padding: 20 },
  roomName: { fontSize: 24, fontWeight: 'bold', color: theme.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  roomPrice: { fontSize: 20, color: theme.text, marginVertical: 10, fontWeight: '600' },
  specRow: { flexDirection: 'row', gap: 15, marginVertical: 10 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  specText: { color: theme.textMuted, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: theme.card, padding: 25, borderRadius: 8, borderWidth: 1, borderColor: theme.primary, elevation: 5, maxHeight: '90%' },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 5 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
  settingLabel: { color: theme.text, fontSize: 16, fontWeight: '500' },
  settingDesc: { color: theme.textMuted, fontSize: 12, marginTop: 4 }
});

// --- 3. INTERNET CONNECTION GUARD ---
function ConnectionGuard({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => setIsConnected(state.isConnected));
    return () => unsubscribe();
  }, []);

  if (!isConnected) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <WifiOff size={64} color={theme.danger} />
        <Text style={[styles.appTitle, { marginTop: 20, color: theme.danger }]}>No Internet</Text>
        <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 10, fontSize: 16 }}>
          Please connect to Wi-Fi or mobile data to access the hotel system.
        </Text>
      </View>
    );
  }
  return children;
}

// --- 4. AUTHENTICATION SCREEN ---
function AuthScreen({ onAuth }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password.');
    setLoading(true);
    const { error } = isLogin ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Error', error.message);
    else if (!isLogin) Alert.alert('Success', 'Account created! You can now log in.');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authContainer}>
      <Text style={styles.appTitle}>Villa Gianna d'Oro</Text>
      <Text style={styles.authSubtitle}>Guest Portal</Text>
      <View style={styles.authCard}>
        <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor={theme.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Authenticating...' : (isLogin ? 'Sign In' : 'Register Account')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={{ marginTop: 20 }}>
          <Text style={styles.switchAuthText}>{isLogin ? "Don't have an account? Register." : "Already have an account? Sign in."}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- 5. BROWSE ROOMS SCREEN ---
function RoomsScreen({ session }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  useEffect(() => { fetchRooms(); }, []);

  const fetchRooms = async () => {
    // REMOVED: .eq('is_available', true) so we fetch ALL rooms now
    const { data } = await supabase.from('rooms').select('*').order('price_per_night', { ascending: true });
    setRooms(data || []);
  };

  const handleBooking = async () => {
    if (!guestName || !guestContact) return Alert.alert('Error', 'Please enter guest name and contact.');
    const { error } = await supabase.from('reservations').insert([{
      room_id: selectedRoom.id, user_id: session.user.id, guest_name: guestName, guest_contact: guestContact,
      check_in_date: checkIn.toISOString().split('T')[0], check_out_date: checkOut.toISOString().split('T')[0], status: 'Pending'
    }]);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Reservation request sent.');
      setSelectedRoom(null); setGuestName(''); setGuestContact('');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => {
          const isAvailable = item.is_available; // Check status

          return (
            <View style={[styles.card, !isAvailable && { opacity: 0.65 }]}>
              <View>
                <Image source={{ uri: item.local_image_ref || 'https://via.placeholder.com/400' }} style={styles.roomImage} />
                
                {/* UNVAILABLE BADGE OVER THE IMAGE */}
                {!isAvailable && (
                  <View style={{ position: 'absolute', top: 15, right: 15, backgroundColor: theme.danger, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>UNAVAILABLE</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.roomName, !isAvailable && { color: theme.textMuted }]}>{item.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>Units: {item.room_number_range || 'N/A'}</Text>
                </View>
                
                <View style={styles.specRow}>
                  <View style={styles.specItem}><Users size={16} color={isAvailable ? theme.primary : theme.textMuted} /><Text style={styles.specText}>{item.capacity || 2}</Text></View>
                  <View style={styles.specItem}><BedDouble size={16} color={isAvailable ? theme.primary : theme.textMuted} /><Text style={styles.specText}>{item.beds || 1}</Text></View>
                  <View style={styles.specItem}><Bath size={16} color={isAvailable ? theme.primary : theme.textMuted} /><Text style={styles.specText}>{item.toilets || 1}</Text></View>
                </View>
                
                <Text style={styles.roomPrice}>₱{item.price_per_night} <Text style={{fontSize: 14, color: theme.textMuted}}>/ night</Text></Text>
                
                {/* DYNAMIC BUTTON */}
                <TouchableOpacity 
                  style={[styles.primaryButton, !isAvailable && { borderColor: theme.border, backgroundColor: 'transparent' }]} 
                  onPress={() => isAvailable ? setSelectedRoom(item) : null}
                  disabled={!isAvailable}
                  activeOpacity={isAvailable ? 0.2 : 1}
                >
                  <Text style={[styles.primaryButtonText, !isAvailable && { color: theme.textMuted }]}>
                    {isAvailable ? 'View Details & Book' : 'Currently Unavailable'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Booking Modal (remains exactly the same) */}
      <Modal visible={!!selectedRoom} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: selectedRoom?.local_image_ref }} style={[styles.roomImage, { borderRadius: 4, marginBottom: 15 }]} />
              <Text style={styles.modalTitle}>{selectedRoom?.name}</Text>
              <Text style={{color: theme.primary, marginBottom: 15, fontSize: 18, fontWeight: 'bold'}}>₱{selectedRoom?.price_per_night} / night</Text>
              
              <View style={{ backgroundColor: theme.bg, padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: theme.border }}>
                <View style={[styles.specRow, { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 }]}>
                  <View style={styles.specItem}><Users size={16} color={theme.primary} /><Text style={styles.specText}>Max {selectedRoom?.capacity || 2} Guests</Text></View>
                  <View style={styles.specItem}><BedDouble size={16} color={theme.primary} /><Text style={styles.specText}>{selectedRoom?.beds || 1} Bed(s)</Text></View>
                </View>
                <Text style={{ color: theme.textMuted, lineHeight: 20 }}>{selectedRoom?.description || 'A beautiful room.'}</Text>
              </View>
              
              <Text style={{ color: theme.text, fontSize: 16, marginBottom: 10, fontWeight: 'bold' }}>Reservation Details</Text>
              <TextInput style={styles.input} placeholder="Primary Guest Full Name" placeholderTextColor={theme.textMuted} value={guestName} onChangeText={setGuestName} />
              <TextInput style={styles.input} placeholder="Contact (Phone or Email)" placeholderTextColor={theme.textMuted} value={guestContact} onChangeText={setGuestContact} />
              
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                <TouchableOpacity style={[styles.input, { flex: 1, marginBottom: 0, flexDirection: 'row', alignItems: 'center' }]} onPress={() => setShowCheckIn(true)}>
                  <CalendarDays size={18} color={theme.primary} style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.text }}>{checkIn.toISOString().split('T')[0]}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.input, { flex: 1, marginBottom: 0, flexDirection: 'row', alignItems: 'center' }]} onPress={() => setShowCheckOut(true)}>
                  <CalendarDays size={18} color={theme.primary} style={{ marginRight: 10 }} />
                  <Text style={{ color: theme.text }}>{checkOut.toISOString().split('T')[0]}</Text>
                </TouchableOpacity>
              </View>

              {showCheckIn && <DateTimePicker value={checkIn} mode="date" onChange={(e, d) => { setShowCheckIn(Platform.OS==='ios'); if(d) setCheckIn(d); }} />}
              {showCheckOut && <DateTimePicker value={checkOut} mode="date" onChange={(e, d) => { setShowCheckOut(Platform.OS==='ios'); if(d) setCheckOut(d); }} />}
              
              <TouchableOpacity style={[styles.primaryButton, { marginTop: 10 }]} onPress={handleBooking}>
                <Text style={styles.primaryButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, {backgroundColor: 'transparent', borderColor: theme.danger, marginBottom: 20}]} onPress={() => setSelectedRoom(null)}>
                <Text style={[styles.primaryButtonText, {color: theme.danger}]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// --- 6. MY BOOKINGS SCREEN ---
function MyBookingsScreen({ session }) {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);
  const [myReservations, setMyReservations] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => { if (isFocused) fetchMyBookings(); }, [isFocused]);

  const fetchMyBookings = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('*, rooms(name)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setMyReservations(data || []);
  };

  // --- NEW: Cancel/Delete Reservation Function ---
  const handleCancelReservation = (id) => {
    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel this booking? This will remove it from the system.",
      [
        { text: "No, Keep It", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from('reservations').delete().eq('id', id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              // Refresh the list after deleting
              fetchMyBookings();
              Alert.alert("Cancelled", "Your reservation has been removed.");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={myReservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{color: theme.textMuted, textAlign: 'center', marginTop: 50}}>You have no reservation history.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { padding: 20 }]}>
            <Text style={styles.roomName}>{item.rooms?.name || 'Deleted Room'}</Text>
            <Text style={{ color: theme.textMuted, marginVertical: 8, fontSize: 16 }}>Dates: {item.check_in_date} to {item.check_out_date}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.text, marginRight: 10, fontSize: 16 }}>Status:</Text>
                <Text style={{ 
                  color: item.status === 'Confirmed' ? theme.success : item.status === 'Cancelled' ? theme.danger : theme.primary, 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase' 
                }}>
                  {item.status}
                </Text>
              </View>

              {/* --- NEW: Cancel Button --- */}
              <TouchableOpacity 
                onPress={() => handleCancelReservation(item.id)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: theme.danger,
                  borderRadius: 4
                }}
              >
                <Text style={{ color: theme.danger, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      />
    </View>
  );
}
// --- 7. ABOUT US SCREEN ---
function AboutUsScreen() {
  const { theme } = useContext(ThemeContext);
  const styles = getStyles(theme);
  
  // Your core team data matches the admin side
  const team = [
    { name: 'Renhiel Maghanoy', role: 'BSIT 3rd Year Student' },
    { name: 'Janna Sumalpong', role: 'CEO' },
    { name: 'Merryl Ignacio', role: 'BSIT 3rd Year Student' },
    { name: 'Erika Jhong Imperio', role: 'BSIT 3rd Year Student' },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 30, alignItems: 'center', backgroundColor: theme.bg }}>
      <Text style={styles.appTitle}>Villa Gianna d'Oro</Text>
      <Text style={{ textAlign: 'center', color: theme.textMuted, fontSize: 16, lineHeight: 24, marginTop: 20, marginBottom: 40 }}>
        Welcome to a world of unparalleled luxury. Our hotel offers a sanctuary of comfort away from the bustling city.
      </Text>
      
      {/* --- NEW: Mission & Vision Cards --- */}
      <View style={{ width: '100%', marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 15 }}>
        
        {/* Vision Card */}
        <View style={{ backgroundColor: theme.card, padding: 25, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
            Our Vision
          </Text>
          <Text style={{ color: theme.textMuted, textAlign: 'center', lineHeight: 22 }}>
            To be the ultimate destination for those seeking tranquility, exceptional service, and timeless design.
          </Text>
        </View>

        {/* Promise (Mission) Card */}
        <View style={{ backgroundColor: theme.card, padding: 25, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
            Our Promise
          </Text>
          <Text style={{ color: theme.textMuted, textAlign: 'center', lineHeight: 22 }}>
            Every guest is treated as royalty. From seamless reservations to personalized room service, we guarantee excellence.
          </Text>
        </View>

      </View>

      {/* Core Team Section */}
      <View style={{ width: '100%', marginBottom: 30 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>
          Meet Our Core Team
        </Text>
        {team.map((member, index) => (
          <View key={index} style={{ backgroundColor: theme.card, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 10, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{member.name}</Text>
            <Text style={{ color: theme.primary, fontSize: 12, textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 }}>{member.role}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// --- 8. SETTINGS SCREEN ---
function SettingsScreen() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const styles = getStyles(theme);
  
  // Dummy states for extra settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={[styles.card, { padding: 20, marginBottom: 20 }]}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Preferences</Text>
        
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Light Mode</Text>
            <Text style={styles.settingDesc}>Switch to a brighter color theme.</Text>
          </View>
          <Switch value={theme.mode === 'light'} onValueChange={toggleTheme} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={theme.mode === 'light' ? '#fff' : '#f4f3f4'} />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDesc}>Get updates on your booking status.</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: theme.border, true: theme.primary }} />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Promotional Offers</Text>
            <Text style={styles.settingDesc}>Receive emails about luxury discounts.</Text>
          </View>
          <Switch value={promoEnabled} onValueChange={setPromoEnabled} trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
      </View>

      <View style={[styles.card, { padding: 20 }]}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Account Security</Text>
        <Text style={{ color: theme.textMuted, marginBottom: 20, lineHeight: 20 }}>Securely end your session to protect your account details and booking history.</Text>
        <TouchableOpacity style={[styles.primaryButton, { borderColor: theme.danger }]} onPress={() => supabase.auth.signOut()}>
          <Text style={[styles.primaryButtonText, { color: theme.danger }]}>Log Out of Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// --- 9. APP WRAPPER & ROUTING ---
const Tab = createBottomTabNavigator();

function MainNavigation({ session }) {
  const { theme } = useContext(ThemeContext);
  
  return (
    <ConnectionGuard>
      {!session ? (
        <AuthScreen onAuth={() => {}} />
      ) : (
        <NavigationContainer theme={theme.mode === 'dark' ? DarkTheme : DefaultTheme}>
          <Tab.Navigator 
            screenOptions={({ route }) => ({
              tabBarIcon: ({ color, size }) => {
                if (route.name === 'Rooms') return <BedDouble size={size} color={color} />;
                if (route.name === 'Bookings') return <BookOpen size={size} color={color} />;
                if (route.name === 'Info') return <Info size={size} color={color} />;
                if (route.name === 'Settings') return <Settings size={size} color={color} />;
              },
              headerStyle: { backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }, 
              headerTintColor: theme.primary, 
              headerTitleStyle: { fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20 },
              tabBarStyle: { backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, paddingBottom: 5, paddingTop: 5, height: 60 },
              tabBarActiveTintColor: theme.primary,
              tabBarInactiveTintColor: theme.textMuted,
            })}
          >
            <Tab.Screen name="Rooms">{() => <RoomsScreen session={session} />}</Tab.Screen>
            <Tab.Screen name="Bookings">{() => <MyBookingsScreen session={session} />}</Tab.Screen>
            <Tab.Screen name="Info" component={AboutUsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </ConnectionGuard>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const toggleTheme = () => setIsLightMode(!isLightMode);
  const currentTheme = isLightMode ? themes.light : themes.dark;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, toggleTheme }}>
      <MainNavigation session={session} />
    </ThemeContext.Provider>
  );
}