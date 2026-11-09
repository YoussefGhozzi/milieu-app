import { Tabs } from 'expo-router';
import { CalendarDays, House, Ticket, User, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@milieu/ui';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.DEFAULT,
        tabBarInactiveTintColor: colors.foreground.muted,
        tabBarStyle: { backgroundColor: colors.surface.DEFAULT, borderTopColor: colors.border.DEFAULT, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="planning" options={{ title: t('tabs.planning'), tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <Tabs.Screen name="bookings" options={{ title: t('tabs.bookings'), tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} /> }} />
      <Tabs.Screen name="wallet" options={{ title: t('tabs.wallet'), tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
