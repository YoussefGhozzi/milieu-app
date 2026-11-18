import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, UserPlus } from 'lucide-react-native';
import { Avatar, Badge, Button, Sheet, Text, cn, colors } from '@milieu/ui';
import type { Role } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { coachRating, createAccount, fullName, setAccountActive } from '@/backend/engine';
import { CoachAvatar, RatingBadge } from '@/pro/Rating';
import { DEMO_PASSWORD } from '@/backend/seed';
import { TextField } from '@/components/Chrome';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { CATEGORIES } from '@/pro/courseText';
import { AutoGrid, ChoiceChips, Page, PageHeader, ROLE_LABEL } from '@/pro/ui';

type RoleFilter = 'all' | Exclude<Role, 'admin'>;
const NEW_ROLES: { key: Exclude<Role, 'admin'>; label: string }[] = [{ key: 'coach', label: 'Coach' }, { key: 'backoffice', label: 'Accueil' }, { key: 'client', label: 'Client' }];

/** Comptes du réseau : seul l'administrateur crée les comptes coach et accueil. */
export default function Accounts() {
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const params = useLocalSearchParams<{ gym?: string }>();
  const [gym, setGym] = useState(params.gym ?? 'all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const list = useMemo(() => db.accounts
    .filter((a) => a.role !== 'admin')
    .filter((a) => gym === 'all' || a.gymId === gym)
    .filter((a) => role === 'all' || a.role === role)
    .filter((a) => !q.trim() || `${fullName(a)} ${a.email}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.role.localeCompare(b.role) || fullName(a).localeCompare(fullName(b))), [db.accounts, gym, role, q]);
  if (!me) return null;
  const gymName = (id: string | null) => db.gyms.find((g) => g.id === id)?.name ?? '—';

  return (
    <Page>
      <PageHeader overline="Administration" title="Comptes" subtitle="Les comptes coach et accueil sont créés uniquement ici. L’accueil peut aussi inscrire des clients."
        right={<Button label="Créer un compte" icon={<UserPlus size={18} color={colors.brand.foreground} />} onPress={() => setOpen(true)} />} />
      <View className="mb-5 gap-3">
        <TextField label="Rechercher" placeholder="Nom ou e-mail" value={q} onChangeText={setQ} icon={<Search size={18} color={colors.foreground.muted} />} />
        <ChoiceChips value={gym} onChange={setGym} options={[{ key: 'all', label: 'Toutes les salles' }, ...db.gyms.map((g) => ({ key: g.id, label: g.name }))]} />
        <ChoiceChips value={role} onChange={setRole} options={[{ key: 'all', label: 'Tous les rôles' }, ...NEW_ROLES]} />
      </View>
      <AutoGrid min={320} gap={12}>
        {list.map((a, i) => (
          <Animated.View key={a.id} entering={FadeInDown.delay(Math.min(i, 12) * 30)}>
            <View className={cn('flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4', !a.active && 'opacity-60')}>
              <CoachAvatar coach={a} size={44} />
              <View className="flex-1 gap-0.5">
                <Text variant="label" className="font-semibold">{fullName(a)}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>{a.email}</Text>
                <View className="mt-1 flex-row flex-wrap gap-1.5">
                  <Badge tone={a.role === 'coach' ? 'success' : a.role === 'backoffice' ? 'warning' : 'brand'} label={ROLE_LABEL[a.role]} />
                  <Badge label={gymName(a.gymId)} />
                  {a.role === 'coach' ? <RatingBadge rating={coachRating(db, a.id)} /> : null}
                </View>
              </View>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: a.active }} onPress={() => {
                const r = run((d) => setAccountActive(d, me, a.id, !a.active));
                toast(r.ok ? (a.active ? 'Compte désactivé' : 'Compte réactivé') : r.error, r.ok ? 'info' : 'danger');
              }} className={cn('h-7 w-12 justify-center rounded-full px-1', a.active ? 'bg-success' : 'bg-surface-raised')}>
                <View className={cn('h-5 w-5 rounded-full bg-white', a.active && 'self-end')} />
              </Pressable>
            </View>
          </Animated.View>
        ))}
      </AutoGrid>
      {!list.length ? <Text variant="label" tone="muted">Aucun compte.</Text> : null}
      <NewAccountSheet open={open} onClose={() => setOpen(false)} defaultGym={gym === 'all' ? db.gyms[0]?.id : gym} />
    </Page>
  );
}

function NewAccountSheet({ open, onClose, defaultGym }: { open: boolean; onClose: () => void; defaultGym?: string }) {
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const [role, setRole] = useState<Exclude<Role, 'admin'>>('coach');
  const [gymId, setGymId] = useState(defaultGym ?? '');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', bio: '' });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [error, setError] = useState('');
  if (!me) return null;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    const r = run((d) => createAccount(d, me, { role, gymId: gymId || defaultGym || null, ...form, specialties: role === 'coach' ? specialties : undefined, password: DEMO_PASSWORD }));
    if (!r.ok) { setError(r.error); return; }
    toast(`Compte ${ROLE_LABEL[role].toLowerCase()} créé pour ${r.value.firstName}. Mot de passe : ${DEMO_PASSWORD}`);
    setForm({ firstName: '', lastName: '', email: '', phone: '', bio: '' }); setSpecialties([]); setError('');
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Créer un compte">
      <ScrollView style={{ maxHeight: 580 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-3 self-center">
          <ChoiceChips value={role} onChange={setRole} options={NEW_ROLES} />
          <Text variant="label" tone="muted">Salle de rattachement</Text>
          <ChoiceChips value={gymId || defaultGym || ''} onChange={setGymId} options={db.gyms.map((g) => ({ key: g.id, label: g.name }))} />
          <View className="flex-row gap-3">
            <View className="flex-1"><TextField label="Prénom" value={form.firstName} onChangeText={set('firstName')} /></View>
            <View className="flex-1"><TextField label="Nom" value={form.lastName} onChangeText={set('lastName')} /></View>
          </View>
          <TextField label="E-mail" autoCapitalize="none" keyboardType="email-address" placeholder={role === 'client' ? 'client@exemple.com' : 'prenom@milieu.tn'} value={form.email} onChangeText={set('email')} />
          <TextField label="Téléphone" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} />
          {role === 'coach' ? (
            <>
              <Text variant="label" tone="muted">Spécialités</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <ChoiceChips key={c.key} value={specialties.includes(c.key) ? c.key : ''} onChange={() => setSpecialties((s) => (s.includes(c.key) ? s.filter((x) => x !== c.key) : [...s, c.key]))}
                    options={[{ key: c.key, label: c.label }]} renderIcon={(k, active) => { const st = disciplineStyle(k); const I = st.icon; return <I size={14} color={active ? colors.brand.foreground : st.color} />; }} />
                ))}
              </View>
              <TextField label="Courte biographie" value={form.bio} onChangeText={set('bio')} />
            </>
          ) : null}
          <Text variant="caption" tone="subtle">Mot de passe provisoire de démo : {DEMO_PASSWORD}</Text>
          {error ? <Text variant="label" tone="danger">{error}</Text> : null}
          <Button block size="lg" label={`Créer le compte ${ROLE_LABEL[role].toLowerCase()}`} onPress={submit} />
        </View>
      </ScrollView>
    </Sheet>
  );
}
