import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ArrowLeft, CalendarCheck, Coins, Dumbbell, Lock, Mail, QrCode, RotateCcw, ShieldCheck, Store, type LucideIcon } from 'lucide-react-native';
import { Avatar, Button, Text, cn, colors } from '@milieu/ui';
import type { Account } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { fullName, login } from '@/backend/engine';
import { DEMO_PASSWORD } from '@/backend/seed';
import { TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';
import { ROLE_HOME, ROLE_LABEL, useBreakpoint } from '@/pro/ui';

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Dumbbell, title: 'Le coach propose', body: 'Cours ponctuel, hebdomadaire, mensuel ou annuel.' },
  { icon: ShieldCheck, title: 'L’accueil valide', body: 'Le cours apparaît dans tous les calendriers.' },
  { icon: CalendarCheck, title: 'Le client réserve', body: 'Il reçoit un ticket QR pour la séance.' },
  { icon: QrCode, title: 'Scan à l’entrée', body: 'Présence validée, jetons débités.' },
  { icon: Coins, title: 'Recharge à l’accueil', body: 'Les jetons sont crédités au comptoir.' },
];

/** Portail des espaces professionnels : coach, accueil (back-office) et administrateur réseau. */
export default function ProPortal() {
  const { db, me, signIn, resetDemo } = useNetwork();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { wide } = useBreakpoint();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (me && me.role !== 'client') return <Redirect href={ROLE_HOME[me.role] as never} />;

  const enter = (a: Account) => { signIn(a); toast(`Bienvenue, ${a.firstName}`); router.replace(ROLE_HOME[a.role as keyof typeof ROLE_HOME] as never); };
  const submit = () => {
    setError('');
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      try {
        const a = login(db, email, password);
        if (a.role === 'client') { setError('Les clients se connectent depuis l’app membre.'); return; }
        enter(a);
      } catch (e) { setError((e as Error).message); }
    }, 500);
  };

  const staff = db.accounts.filter((a) => a.role !== 'client' && a.active);
  const admin = staff.find((a) => a.role === 'admin');

  const hero = (
    <View className={cn('overflow-hidden', wide ? 'flex-1' : 'rounded-xl')}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="pro-hero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brand.DEFAULT} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.brand.strong} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#pro-hero)" />
      </Svg>
      <View className={cn('gap-6', wide ? 'flex-1 justify-center p-14' : 'p-6')}>
        <Text variant="overline" tone="onBrand">Espace professionnel</Text>
        <Text variant="display" tone="onBrand" className={wide ? 'text-[44px] leading-[50px]' : ''}>Gérez vos cours, vos salles et vos membres.</Text>
        {wide ? (
          <View className="mt-2 gap-4">
            {STEPS.map((s, i) => {
              const I = s.icon;
              return (
                <Appear key={s.title} index={i + 1}>
                  <View className="flex-row items-center gap-4">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-black/15"><I size={20} color={colors.brand.foreground} /></View>
                    <View className="flex-1">
                      <Text variant="label" tone="onBrand" className="font-bold">{s.title}</Text>
                      <Text variant="caption" tone="onBrand" className="opacity-80">{s.body}</Text>
                    </View>
                  </View>
                </Appear>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );

  const form = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: wide ? 56 : insets.top + 16, paddingBottom: 40, paddingHorizontal: wide ? 56 : 16 }}>
      <View className="w-full max-w-[460px] gap-5 self-center">
        <Pressable onPress={() => router.replace('/login')} className="flex-row items-center gap-2 self-start" hitSlop={8}>
          <ArrowLeft size={16} color={colors.foreground.muted} />
          <Text variant="label" tone="muted">App membre</Text>
        </Pressable>
        <Appear><Logo height={26} /></Appear>
        {!wide ? hero : null}
        <Appear index={1}>
          <Text variant="title">Connexion</Text>
          <Text tone="muted" className="mt-1">Coachs, accueil et administration. Les comptes coach sont créés par l’administrateur.</Text>
        </Appear>
        <Appear index={2}>
          <View className="gap-4">
            <TextField label="E-mail professionnel" placeholder="prenom@milieu.tn" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} icon={<Mail size={18} color={colors.foreground.muted} />} />
            <TextField label="Mot de passe" placeholder="Votre mot de passe" secure value={password} onChangeText={setPassword} error={error} onSubmitEditing={submit} icon={<Lock size={18} color={colors.foreground.muted} />} />
            <Button block size="lg" label="Se connecter" loading={busy} onPress={submit} />
          </View>
        </Appear>

        <Appear index={3}>
          <View className="gap-3 rounded-xl border border-dashed border-brand/50 bg-brand-soft p-4">
            <View className="flex-row items-center justify-between">
              <Text variant="label" className="font-semibold">Comptes de démo · un clic</Text>
              <Text variant="caption" tone="muted">mot de passe : {DEMO_PASSWORD}</Text>
            </View>
            {admin ? <DemoRow a={admin} gym="Tout le réseau" onPress={() => enter(admin)} /> : null}
            {db.gyms.map((g) => {
              const people = staff.filter((a) => a.gymId === g.id).sort((a, b) => a.role.localeCompare(b.role));
              if (!people.length) return null;
              return (
                <View key={g.id} className="gap-1">
                  <View className="mt-1 flex-row items-center gap-2"><Store size={14} color={colors.brand.DEFAULT} /><Text variant="caption" tone="brand" className="font-bold uppercase tracking-widest">{g.name}</Text></View>
                  {people.map((a) => <DemoRow key={a.id} a={a} onPress={() => enter(a)} />)}
                </View>
              );
            })}
          </View>
        </Appear>
        <Pressable onPress={() => { resetDemo(); toast('Données de démo réinitialisées', 'info'); }} className="flex-row items-center gap-2 self-center py-2" hitSlop={8}>
          <RotateCcw size={14} color={colors.foreground.subtle} />
          <Text variant="caption" tone="subtle">Réinitialiser les données de démo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      {wide ? <View className="flex-1 flex-row">{hero}<View className="flex-1">{form}</View></View> : form}
    </KeyboardAvoidingView>
  );
}

function DemoRow({ a, gym, onPress }: { a: Account; gym?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Se connecter en tant que ${fullName(a)}`} onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg bg-surface/70 px-3 py-2.5 active:opacity-70">
      <Avatar name={fullName(a)} size={34} />
      <View className="flex-1">
        <Text variant="label" className="font-semibold">{fullName(a)}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>{a.email}</Text>
      </View>
      <View className="rounded-full bg-surface-raised px-2.5 py-1"><Text variant="caption" className="font-semibold">{gym ? `${ROLE_LABEL[a.role]} · ${gym}` : ROLE_LABEL[a.role]}</Text></View>
    </Pressable>
  );
}
