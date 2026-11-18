import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';

/** Ce que la barre d'onglets personnalisée utilise des props fournies par React Navigation. */
interface BottomTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Building2, ChevronsUpDown, type LucideIcon } from 'lucide-react-native';
import { Avatar, Text, cn, colors } from '@milieu/ui';
import type { Role } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { fullName } from '@/backend/engine';
import { Logo } from '@/components/Logo';
import { AccountSheet, ROLE_LABEL, useBreakpoint } from './ui';

export interface NavItem { name: string; title: string; short?: string; icon: LucideIcon; badge?: number }

/**
 * Coquille des espaces pro : barre latérale sur ordinateur (≥ 900 px), barre d'onglets en bas sinon.
 * Vérifie aussi que le compte connecté a le bon rôle.
 */
export function ProShell({ role, items, hidden = [] }: { role: Exclude<Role, 'client'>; items: NavItem[]; hidden?: string[] }) {
  const { me } = useNetwork();
  const { wide } = useBreakpoint();
  if (!me) return <Redirect href="/pro" />;
  if (me.role !== role) return <Redirect href={`/pro/${me.role}` as never} />;
  return (
    <Tabs
      tabBar={(props) => <ProNav {...props} items={items} wide={wide} />}
      screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom', sceneStyle: { backgroundColor: colors.background }, animation: 'fade' }}
    >
      {items.map((i) => <Tabs.Screen key={i.name} name={i.name} options={{ title: i.title }} />)}
      {/* Écrans hors menu (ex. création de cours) : la barre personnalisée n'affiche que `items`. */}
      {hidden.map((n) => <Tabs.Screen key={n} name={n} />)}
    </Tabs>
  );
}

function ProNav({ state, navigateToTab, items, wide }: BottomTabBarProps & { items: NavItem[]; wide: boolean }) {
  const insets = useSafeAreaInsets();
  const { me, myGym, db } = useNetwork();
  const [sheet, setSheet] = useState(false);
  const current = state.routes[state.index]?.name;
  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (route && name !== current) navigateToTab(route.key);
  };
  const unread = me ? db.notifications.filter((n) => n.accountId === me.id && !n.read).length : 0;

  if (wide) {
    return (
      <View style={{ width: 268, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }} className="border-r border-border bg-surface px-4">
        <View className="px-2">
          <Logo height={22} />
          <View className="mt-5 flex-row items-center gap-2 rounded-lg bg-surface-raised px-3 py-2.5">
            <Building2 size={16} color={colors.brand.DEFAULT} />
            <View className="flex-1">
              <Text variant="caption" tone="subtle">{me ? ROLE_LABEL[me.role] : ''}</Text>
              <Text variant="label" className="font-semibold" numberOfLines={1}>{myGym?.name ?? 'Réseau MILIEU'}</Text>
            </View>
          </View>
        </View>
        <View className="mt-6 flex-1 gap-1">
          {items.map((it) => {
            const active = it.name === current;
            const I = it.icon;
            return (
              <Pressable key={it.name} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(it.name)}
                className={cn('h-12 flex-row items-center gap-3 rounded-lg px-3', active ? 'bg-brand-soft' : 'active:bg-surface-raised')}>
                {active ? <Animated.View entering={FadeIn} layout={LinearTransition} className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-brand" /> : null}
                <I size={20} color={active ? colors.brand.DEFAULT : colors.foreground.muted} />
                <Text variant="label" tone={active ? 'brand' : 'muted'} className="flex-1 font-semibold">{it.title}</Text>
                {it.badge ? <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5"><Text variant="caption" tone="onBrand" className="text-[11px] font-bold leading-[14px]">{it.badge}</Text></View> : null}
              </Pressable>
            );
          })}
        </View>
        {me ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Mon compte" onPress={() => setSheet(true)}
            className="flex-row items-center gap-3 rounded-lg border border-border p-3 active:bg-surface-raised">
            <View>
              <Avatar name={fullName(me)} size={40} />
              {unread ? <View className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-brand" /> : null}
            </View>
            <View className="flex-1">
              <Text variant="label" className="font-semibold" numberOfLines={1}>{fullName(me)}</Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>{me.email}</Text>
            </View>
            <ChevronsUpDown size={16} color={colors.foreground.subtle} />
          </Pressable>
        ) : null}
        <AccountSheet open={sheet} onClose={() => setSheet(false)} />
      </View>
    );
  }

  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 8) }} className="flex-row border-t border-border bg-surface px-1 pt-1.5">
      {items.map((it) => {
        const active = it.name === current;
        const I = it.icon;
        return (
          <Pressable key={it.name} accessibilityRole="tab" accessibilityLabel={it.title} accessibilityState={{ selected: active }} onPress={() => go(it.name)}
            className="min-h-[52px] flex-1 items-center justify-center gap-1">
            <View className={cn('h-8 w-14 items-center justify-center rounded-full', active && 'bg-brand-soft')}>
              <I size={20} color={active ? colors.brand.DEFAULT : colors.foreground.muted} />
              {it.badge ? <View className="absolute right-2 top-0 h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1"><Text variant="caption" tone="onBrand" className="text-[10px] font-bold leading-[13px]">{it.badge}</Text></View> : null}
            </View>
            <Text variant="caption" tone={active ? 'brand' : 'muted'} numberOfLines={1} className="text-[11px] font-semibold">{it.short ?? it.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
