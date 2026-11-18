import { Children, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, LogOut, Minus, Moon, Plus, Sun, type LucideIcon } from 'lucide-react-native';
import { Avatar, Badge, Divider, Sheet, Text, cn, colors } from '@milieu/ui';
import type { CourseStatus, Role, TicketStatus, TokenMove } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { METHOD_LABEL, fullName, markAllRead } from '@/backend/engine';
import { useAppTheme } from '@/theme/AppTheme';
import { Appear, Tap } from '@/components/motion';
import { relative } from '@/lib/format';

/** Points de rupture des espaces pro : barre latérale à partir de 900 px. */
export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return { width, wide: width >= 900, phone: width < 600 };
}

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrateur', backoffice: 'Accueil', coach: 'Coach', client: 'Client' };
export const ROLE_HOME: Record<Exclude<Role, 'client'>, string> = { admin: '/pro/admin', backoffice: '/pro/backoffice', coach: '/pro/coach' };

/** Conteneur d'une page pro : défilement, marges adaptées, largeur maximale. */
export function Page({ children, maxWidth = 1200 }: { children: ReactNode; maxWidth?: number }) {
  const insets = useSafeAreaInsets();
  const { wide, phone } = useBreakpoint();
  return (
    <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: wide ? 32 : insets.top + 16, paddingBottom: 48, paddingHorizontal: phone ? 16 : wide ? 40 : 24 }}>
      <View style={{ width: '100%', maxWidth, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
}

export function PageHeader({ overline, title, subtitle, right }: { overline?: string; title: string; subtitle?: string; right?: ReactNode }) {
  const { wide } = useBreakpoint();
  return (
    <Appear>
      <View className="mb-6 flex-row flex-wrap items-start justify-between gap-4">
        <View className="min-w-[220px] flex-1">
          {overline ? <Text variant="overline" tone="brand">{overline}</Text> : null}
          <Text variant="title" className="mt-1">{title}</Text>
          {subtitle ? <Text tone="muted" className="mt-1">{subtitle}</Text> : null}
        </View>
        <View className="flex-row items-center gap-3">
          {right}
          {!wide ? <AccountButton /> : null}
        </View>
      </View>
    </Appear>
  );
}

/** Grille qui choisit seule son nombre de colonnes selon la largeur disponible. */
export function AutoGrid({ children, min = 260, gap = 16 }: { children: ReactNode; min?: number; gap?: number }) {
  const [w, setW] = useState(0);
  const items = Children.toArray(children);
  const cols = w ? Math.max(1, Math.min(items.length || 1, Math.floor((w + gap) / (min + gap)))) : 1;
  const itemW = w ? (w - gap * (cols - 1)) / cols : undefined;
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {items.map((child, i) => <View key={i} style={{ width: itemW ?? '100%' }}>{child}</View>)}
    </View>
  );
}

export function StatCard({ icon: Icon, label, value, hint, color, index = 0, onPress }: {
  icon: LucideIcon; label: string; value: string | number; hint?: string; color?: string; index?: number; onPress?: () => void;
}) {
  const c = color ?? colors.brand.DEFAULT;
  const body = (
    <View className="gap-3 rounded-xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between">
        <Text variant="label" tone="muted">{label}</Text>
        <View style={{ backgroundColor: `${c}22` }} className="h-9 w-9 items-center justify-center rounded-full"><Icon size={18} color={c} /></View>
      </View>
      <Text variant="display" className="text-[34px] leading-[40px]">{String(value)}</Text>
      {hint ? <Text variant="caption" tone="subtle">{hint}</Text> : null}
    </View>
  );
  return <Appear index={index}>{onPress ? <Tap onPress={onPress} accessibilityLabel={label}>{body}</Tap> : body}</Appear>;
}

export function Panel({ title, action, onAction, children, className }: { title: string; action?: string; onAction?: () => void; children: ReactNode; className?: string }) {
  return (
    <View className={cn('rounded-xl border border-border bg-surface p-5', className)}>
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text variant="heading">{title}</Text>
        {action ? <Pressable accessibilityRole="link" onPress={onAction} hitSlop={10}><Text variant="label" tone="brand">{action}</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

const COURSE_PILL: Record<CourseStatus, { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'En attente de validation', tone: 'warning' },
  approved: { label: 'Validé', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'danger' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};
export const CoursePill = ({ status }: { status: CourseStatus }) => <Badge label={COURSE_PILL[status].label} tone={COURSE_PILL[status].tone} />;

const TICKET_PILL: Record<TicketStatus, { label: string; tone: 'brand' | 'success' | 'danger' | 'neutral' | 'warning' }> = {
  booked: { label: 'Réservé', tone: 'brand' },
  attended: { label: 'Présent', tone: 'success' },
  no_show: { label: 'Absent · débité', tone: 'danger' },
  late_cancel: { label: 'Annulation tardive', tone: 'warning' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};
export const TicketPill = ({ status }: { status: TicketStatus }) => <Badge label={TICKET_PILL[status].label} tone={TICKET_PILL[status].tone} />;

/** Ligne de l'historique des jetons du réseau (recharge, réservation, débit…). */
export function MoveRow({ m }: { m: TokenMove }) {
  const positive = m.amount > 0;
  const consume = m.type === 'consume';
  const value = consume ? `−${m.settled ?? 0} débités` : `${positive ? '+' : ''}${m.amount}`;
  const tone = consume ? 'danger' : m.type === 'hold' ? 'warning' : positive ? 'success' : 'muted';
  return (
    <View className="flex-row items-center gap-3 border-t border-border py-2.5">
      <View className="flex-1">
        <Text variant="label">{m.label}</Text>
        <Text variant="caption" tone="subtle">{relative(m.at)}{m.method ? ` · ${METHOD_LABEL[m.method]}` : ''}{m.type === 'hold' ? ' · réservés jusqu’à la séance' : ''}</Text>
      </View>
      <Text variant="label" tone={tone} className="font-bold">{value}</Text>
    </View>
  );
}

/** Compteur – / + accessible (places, jetons, montant). */
export function Stepper({ value, onChange, min = 0, max = 999, step = 1, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const btn = (I: LucideIcon, delta: number, label: string) => {
    const next = Math.min(max, Math.max(min, value + delta));
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={next === value} onPress={() => onChange(next)}
        className={cn('h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised active:opacity-70', next === value && 'opacity-40')}>
        <I size={18} color={colors.foreground.DEFAULT} />
      </Pressable>
    );
  };
  return (
    <View className="flex-row items-center gap-3">
      {btn(Minus, -step, 'Diminuer')}
      <View className="min-w-[72px] items-center">
        <Text variant="title" className="leading-8">{value}</Text>
        {suffix ? <Text variant="caption" tone="muted">{suffix}</Text> : null}
      </View>
      {btn(Plus, step, 'Augmenter')}
    </View>
  );
}

/** Choix parmi quelques options (puces). */
export function ChoiceChips<T extends string | number>({ options, value, onChange, renderIcon }: {
  options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; renderIcon?: (key: T, active: boolean) => ReactNode;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={String(o.key)} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => onChange(o.key)}
            className={cn('h-10 flex-row items-center gap-2 rounded-full border px-4 active:opacity-80', active ? 'border-brand bg-brand' : 'border-border bg-surface')}>
            {renderIcon?.(o.key, active)}
            <Text variant="label" tone={active ? 'onBrand' : 'default'} className="font-semibold">{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bouton compte : notifications, thème, déconnexion (en haut des pages sur téléphone et tablette). */
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const { me, db } = useNetwork();
  if (!me) return null;
  const unread = db.notifications.filter((n) => n.accountId === me.id && !n.read).length;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Mon compte, ${unread} notifications non lues`} onPress={() => setOpen(true)}>
        <Avatar name={fullName(me)} size={44} />
        {unread ? (
          <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-brand px-1">
            <Text variant="caption" tone="onBrand" className="text-[10px] font-bold leading-[13px]">{unread}</Text>
          </View>
        ) : null}
      </Pressable>
      <AccountSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, myGym, db, run, signOut } = useNetwork();
  const { mode, toggle } = useAppTheme();
  if (!me) return null;
  const mine = db.notifications.filter((n) => n.accountId === me.id).slice(0, 6);
  const unread = mine.some((n) => !n.read);
  return (
    <Sheet open={open} onClose={onClose}>
      <View className="w-full max-w-xl gap-4 self-center">
        <View className="flex-row items-center gap-3">
          <Avatar name={fullName(me)} size={52} />
          <View className="flex-1">
            <Text variant="heading">{fullName(me)}</Text>
            <Text variant="caption" tone="muted">{ROLE_LABEL[me.role]}{myGym ? ` · ${myGym.name}` : ' · Tout le réseau'}</Text>
          </View>
        </View>
        <Divider />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2"><Bell size={16} color={colors.foreground.muted} /><Text variant="label" className="font-semibold">Notifications</Text></View>
          {unread ? <Pressable onPress={() => run((d) => markAllRead(d, me.id))} hitSlop={8}><Text variant="label" tone="brand">Tout marquer comme lu</Text></Pressable> : null}
        </View>
        <ScrollView style={{ maxHeight: 260 }}>
          {mine.length ? mine.map((n) => (
            <Pressable key={n.id} onPress={() => { onClose(); if (n.link) router.push(n.link as never); }} className="flex-row gap-3 py-2.5 active:opacity-70">
              <View className={cn('mt-1.5 h-2 w-2 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} />
              <View className="flex-1">
                <Text variant="label" className="font-semibold">{n.title}</Text>
                <Text variant="caption" tone="muted">{n.body}</Text>
                <Text variant="caption" tone="subtle" className="mt-0.5">{relative(n.at)}</Text>
              </View>
            </Pressable>
          )) : <Text variant="label" tone="muted">Aucune notification.</Text>}
        </ScrollView>
        <Divider />
        <View className="flex-row gap-3">
          <Pressable onPress={toggle} className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised active:opacity-80">
            {mode === 'dark' ? <Sun size={18} color={colors.warning.DEFAULT} /> : <Moon size={18} color={colors.info.DEFAULT} />}
            <Text variant="label" className="font-semibold">{mode === 'dark' ? 'Mode jour' : 'Mode nuit'}</Text>
          </Pressable>
          <Pressable onPress={() => { onClose(); signOut(); router.replace('/pro'); }} className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-danger-soft active:opacity-80">
            <LogOut size={18} color={colors.danger.DEFAULT} />
            <Text variant="label" tone="danger" className="font-semibold">Se déconnecter</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}
