import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { CheckCircle2, Coins, Mail, Phone, Search, UserPlus, Wallet } from 'lucide-react-native';
import { Avatar, Button, Divider, EmptyState, Sheet, Text, TokenAmount, cn, colors } from '@milieu/ui';
import type { Account, TokenMove } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { createAccount, formatTnd, fullName, quoteRecharge, rechargeTokens, walletOf } from '@/backend/engine';
import { DEMO_PASSWORD } from '@/backend/seed';
import { TextField } from '@/components/Chrome';
import { useToast } from '@/components/Toast';
import { dayLabel, time } from '@/lib/format';
import { ChoiceChips, MoveRow, Page, PageHeader, Panel, Stepper, TicketPill, useBreakpoint } from '@/pro/ui';

const AMOUNTS = [5, 10, 20, 40, 60];
const METHODS: { key: NonNullable<TokenMove['method']>; label: string }[] = [
  { key: 'cash', label: 'Espèces' }, { key: 'card_terminal', label: 'TPE (carte)' }, { key: 'transfer', label: 'Virement' },
];

/** Clients de la salle : soldes, historique et recharge de jetons au comptoir. */
export default function Clients() {
  const { db, me, myGym } = useNetwork();
  const { wide } = useBreakpoint();
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recharge, setRecharge] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  const clients = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.accounts
      .filter((a) => a.role === 'client' && a.gymId === myGym?.id)
      .filter((a) => !term || `${fullName(a)} ${a.email} ${a.phone}`.toLowerCase().includes(term))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [db.accounts, myGym, q]);

  if (!me || !myGym) return null;
  const selected = clients.find((c) => c.id === selectedId) ?? (wide ? clients[0] : undefined);

  return (
    <Page>
      <PageHeader overline={myGym.name} title="Clients & jetons" subtitle="Le client paie au comptoir (espèces, TPE…), vous créditez ses jetons ici. Aucun paiement bancaire dans l’app."
        right={<Button variant="secondary" label="Nouveau client" icon={<UserPlus size={18} color={colors.foreground.DEFAULT} />} onPress={() => setCreating(true)} />} />

      <View className={cn('gap-5', wide && 'flex-row items-start')}>
        <View className={wide ? 'w-[400px]' : 'w-full'}>
          <TextField label="Rechercher" placeholder="Nom, e-mail ou téléphone" value={q} onChangeText={setQ} icon={<Search size={18} color={colors.foreground.muted} />} />
          <View className="mt-4 gap-2">
            {clients.map((c, i) => {
              const w = walletOf(db, c.id);
              const active = selected?.id === c.id;
              return (
                <Animated.View key={c.id} entering={FadeInDown.delay(i * 30)}>
                  <Pressable accessibilityRole="button" onPress={() => setSelectedId(c.id)}
                    className={cn('flex-row items-center gap-3 rounded-xl border p-3 active:opacity-80', active && wide ? 'border-brand bg-brand-soft' : 'border-border bg-surface')}>
                    <Avatar name={fullName(c)} size={42} />
                    <View className="flex-1">
                      <Text variant="label" className="font-semibold">{fullName(c)}{!c.active ? ' (désactivé)' : ''}</Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>{c.email}</Text>
                    </View>
                    <View className="items-end">
                      <TokenAmount value={w.available} size="sm" />
                      {w.held ? <Text variant="caption" tone="subtle">{w.held} réservés</Text> : null}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
            {!clients.length ? <Text variant="label" tone="muted" className="mt-2">Aucun client trouvé.</Text> : null}
          </View>
        </View>

        {wide ? (
          <View className="flex-1">{selected ? <ClientDetail key={selected.id} client={selected} onRecharge={() => setRecharge(selected)} /> : null}</View>
        ) : null}
      </View>

      {!wide ? (
        <Sheet open={!!selected} onClose={() => setSelectedId(null)}>
          <ScrollView style={{ maxHeight: 560 }}>{selected ? <ClientDetail client={selected} onRecharge={() => { setRecharge(selected); setSelectedId(null); }} /> : null}</ScrollView>
        </Sheet>
      ) : null}

      <RechargeSheet client={recharge} onClose={() => setRecharge(null)} />
      <NewClientSheet open={creating} onClose={() => setCreating(false)} onCreated={(a) => { setCreating(false); setSelectedId(a.id); }} />
    </Page>
  );
}

function ClientDetail({ client, onRecharge }: { client: Account; onRecharge: () => void }) {
  const { db } = useNetwork();
  const w = walletOf(db, client.id);
  const tickets = db.tickets.filter((t) => t.clientId === client.id).sort((a, b) => b.occurrenceAt.localeCompare(a.occurrenceAt)).slice(0, 6);
  return (
    <Animated.View entering={FadeIn.duration(250)} className="gap-5">
      <View className="gap-4 rounded-xl border border-border bg-surface p-5">
        <View className="flex-row items-center gap-4">
          <Avatar name={fullName(client)} size={56} />
          <View className="flex-1">
            <Text variant="title">{fullName(client)}</Text>
            <View className="mt-1 flex-row flex-wrap gap-x-4 gap-y-1">
              <View className="flex-row items-center gap-1.5"><Mail size={13} color={colors.foreground.muted} /><Text variant="caption" tone="muted">{client.email}</Text></View>
              <View className="flex-row items-center gap-1.5"><Phone size={13} color={colors.foreground.muted} /><Text variant="caption" tone="muted">{client.phone || '—'}</Text></View>
            </View>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-3">
          <Metric label="Disponibles" value={w.available} strong />
          <Metric label="Réservés" value={w.held} />
          <Metric label="Débités" value={w.spent} />
        </View>
        <Button block size="lg" label="Recharger des jetons" icon={<Wallet size={18} color={colors.brand.foreground} />} onPress={onRecharge} />
      </View>
      <Panel title="Mouvements de jetons">
        {w.moves.slice(0, 8).map((m) => <MoveRow key={m.id} m={m} />)}
        {!w.moves.length ? <Text variant="label" tone="muted">Aucun mouvement.</Text> : null}
      </Panel>
      <Panel title="Réservations">
        {tickets.map((t) => {
          const c = db.courses.find((x) => x.id === t.courseId);
          return (
            <View key={t.id} className="flex-row items-center gap-3 py-2">
              <View className="flex-1">
                <Text variant="label" className="font-semibold">{c?.title}</Text>
                <Text variant="caption" tone="muted">{dayLabel(t.occurrenceAt)} · {time(t.occurrenceAt)}</Text>
              </View>
              <TicketPill status={t.status} />
            </View>
          );
        })}
        {!tickets.length ? <Text variant="label" tone="muted">Aucune réservation.</Text> : null}
      </Panel>
    </Animated.View>
  );
}

function Metric({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View className={cn('min-w-[110px] flex-1 gap-1 rounded-lg p-3', strong ? 'bg-brand-soft' : 'bg-surface-raised')}>
      <Text variant="caption" tone="muted">{label}</Text>
      <TokenAmount value={value} size="md" tone={strong ? 'brand' : 'default'} />
    </View>
  );
}

function RechargeSheet({ client, onClose }: { client: Account | null; onClose: () => void }) {
  const { me, db, run } = useNetwork();
  const toast = useToast();
  const [amount, setAmount] = useState(10);
  const [method, setMethod] = useState<NonNullable<TokenMove['method']>>('cash');
  const [note, setNote] = useState('');
  const [done, setDone] = useState<{ amount: number; after: number; bonus: number; paid: number } | null>(null);
  if (!me) return null;
  const confirm = () => {
    if (!client) return;
    const r = run((d) => { const q = rechargeTokens(d, me, client.id, amount, method, note); return { q, after: walletOf(d, client.id).available }; });
    if (!r.ok) { toast(r.error, 'danger'); return; }
    setDone({ amount, after: r.value.after, bonus: r.value.q.bonus, paid: r.value.q.total });
    setNote('');
  };
  const before = client ? walletOf(db, client.id).available : 0;
  const quote = client?.gymId ? quoteRecharge(db, client.gymId, amount) : null;
  return (
    <>
      <Sheet open={!!client && !done} onClose={onClose} title="Recharger des jetons">
        {client ? (
          <ScrollView style={{ maxHeight: 640 }} keyboardShouldPersistTaps="handled"><View className="w-full max-w-xl gap-4 self-center">
            <View className="flex-row items-center gap-3">
              <Avatar name={fullName(client)} size={40} />
              <View className="flex-1"><Text variant="label" className="font-semibold">{fullName(client)}</Text><Text variant="caption" tone="muted">Solde actuel : {before} jetons</Text></View>
            </View>
            <ChoiceChips value={AMOUNTS.includes(amount) ? amount : -1} onChange={(v) => v > 0 && setAmount(v)} options={AMOUNTS.map((a) => ({ key: a, label: `${a} jetons` }))} />
            <View className="flex-row items-center justify-between rounded-lg bg-surface-raised p-3">
              <Text variant="label" tone="muted">Montant exact</Text>
              <Stepper value={amount} onChange={setAmount} min={1} max={500} suffix="jetons" />
            </View>
            <View className="gap-2"><Text variant="label" tone="muted">Payé par</Text><ChoiceChips value={method} onChange={setMethod} options={METHODS} /></View>
            <TextField label="Note (facultatif)" placeholder="Ex. Pack MOVE, reçu n° 123" value={note} onChangeText={setNote} />
            <Divider />
            {quote ? (
              <View className="gap-2 rounded-lg bg-surface-raised p-4">
                <View className="flex-row justify-between"><Text variant="label" tone="muted">{amount} jetons × {formatTnd(quote.unitPrice)}</Text><Text variant="label">{formatTnd(quote.base)}</Text></View>
                {quote.percentPromo ? (
                  <View className="flex-row justify-between"><Text variant="label" tone="success">{quote.percentPromo.title} (−{quote.percentPromo.value} %)</Text><Text variant="label" tone="success">−{formatTnd(quote.discount)}</Text></View>
                ) : null}
                {quote.bonusPromo ? (
                  <View className="flex-row justify-between"><Text variant="label" tone="success">{quote.bonusPromo.title}</Text><Text variant="label" tone="success">+{quote.bonus} jetons offerts</Text></View>
                ) : null}
                <View className="h-px bg-border" />
                <View className="flex-row items-center justify-between"><Text variant="label" className="font-semibold">À encaisser</Text><Text variant="title">{formatTnd(quote.total)}</Text></View>
                <View className="flex-row items-center justify-between"><Text variant="label" tone="muted">Solde après recharge</Text><TokenAmount value={before + amount + quote.bonus} size="sm" /></View>
              </View>
            ) : null}
            <Button block size="lg" label={`Encaisser ${quote ? formatTnd(quote.total) : ''} · créditer ${amount + (quote?.bonus ?? 0)} jetons`} icon={<Coins size={18} color={colors.brand.foreground} />} onPress={confirm} />
            <Button block variant="ghost" label="Annuler" onPress={onClose} />
          </View></ScrollView>
        ) : null}
      </Sheet>
      <Modal visible={!!done} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 p-5">
          <Animated.View entering={ZoomIn.springify().damping(14)} className="w-full max-w-sm items-center gap-4 rounded-xl border border-border bg-surface p-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-success-soft"><CheckCircle2 size={44} color={colors.success.DEFAULT} /></View>
            <Text variant="title" className="text-center">+{done?.amount} jetons{done?.bonus ? ` (+${done.bonus} offerts)` : ''}</Text>
            <Text tone="muted" className="text-center">{formatTnd(done?.paid ?? 0)} encaissés. Crédités à {client?.firstName}, nouveau solde : {done?.after} jetons. Le client est notifié.</Text>
            <Button block label="Terminé" onPress={() => { setDone(null); onClose(); }} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

function NewClientSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (a: Account) => void }) {
  const { me, run } = useNetwork();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [error, setError] = useState('');
  if (!me) return null;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    const r = run((d) => createAccount(d, me, { role: 'client', gymId: me.gymId, ...form, password: DEMO_PASSWORD }));
    if (!r.ok) { setError(r.error); return; }
    toast(`Compte de ${r.value.firstName} créé`);
    setForm({ firstName: '', lastName: '', email: '', phone: '' });
    setError('');
    onCreated(r.value);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nouveau client">
      <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-3 self-center">
          <View className="flex-row gap-3">
            <View className="flex-1"><TextField label="Prénom" value={form.firstName} onChangeText={set('firstName')} /></View>
            <View className="flex-1"><TextField label="Nom" value={form.lastName} onChangeText={set('lastName')} /></View>
          </View>
          <TextField label="E-mail" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
          <TextField label="Téléphone" keyboardType="phone-pad" value={form.phone} onChangeText={set('phone')} error={error} />
          <Text variant="caption" tone="subtle">Mot de passe provisoire de démo : {DEMO_PASSWORD}</Text>
          <Button block size="lg" label="Créer le compte" onPress={submit} />
        </View>
      </ScrollView>
    </Sheet>
  );
}
