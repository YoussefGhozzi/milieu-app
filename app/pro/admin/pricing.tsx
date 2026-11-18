import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { BadgePercent, Calculator, Coins, Gift, Plus, Store, Trash2 } from 'lucide-react-native';
import { Badge, Button, Sheet, Text, cn, colors } from '@milieu/ui';
import type { Gym, Promotion } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { createPromotion, deletePromotion, formatTnd, promoLabel, promoState, quoteRecharge, setPromotionActive, setTokenPrice, type PromoState } from '@/backend/engine';
import { TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { addDays } from '@/lib/format';
import { DatePicker } from '@/pro/Calendar';
import { AutoGrid, ChoiceChips, Page, PageHeader, Panel, Stepper } from '@/pro/ui';

const STATE: Record<PromoState, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  active: { label: 'En cours', tone: 'success' }, scheduled: { label: 'Programmée', tone: 'warning' }, expired: { label: 'Terminée', tone: 'neutral' }, disabled: { label: 'Désactivée', tone: 'danger' },
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dmy = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Gestion administrateur : prix du jeton en dinars et promotions, salle par salle. */
export default function Pricing() {
  const { db } = useNetwork();
  const [creatingFor, setCreatingFor] = useState<Gym | null>(null);
  return (
    <Page>
      <PageHeader overline="Administration" title="Tarifs & promotions" subtitle="Fixez le prix du jeton dans chaque salle et lancez des promotions. L’accueil les applique automatiquement aux recharges, et les clients les voient dans l’app." />
      <View className="gap-6">
        {db.gyms.map((g, i) => <GymPricing key={g.id} gym={g} index={i} onNewPromo={() => setCreatingFor(g)} />)}
      </View>
      <PromoSheet gym={creatingFor} onClose={() => setCreatingFor(null)} />
    </Page>
  );
}

function GymPricing({ gym, index, onNewPromo }: { gym: Gym; index: number; onNewPromo: () => void }) {
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const [price, setPrice] = useState(String(gym.tokenPriceTnd).replace('.', ','));
  const [sim, setSim] = useState(20);
  if (!me) return null;
  const parsed = Number(price.replace(',', '.'));
  const dirty = parsed !== gym.tokenPriceTnd;
  const promos = db.promotions.filter((p) => p.gymId === gym.id).sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  const q = quoteRecharge(db, gym.id, sim);

  const save = () => {
    const r = run((d) => setTokenPrice(d, me, gym.id, parsed));
    toast(r.ok ? `${gym.name} : 1 jeton = ${formatTnd(parsed)}` : r.error, r.ok ? 'success' : 'danger');
  };

  return (
    <Appear index={index}>
      <View className="gap-5 rounded-xl border border-border bg-surface p-5">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft"><Store size={20} color={colors.brand.DEFAULT} /></View>
            <View><Text variant="heading">{gym.name}</Text><Text variant="caption" tone="muted">{gym.city}</Text></View>
          </View>
          <Button size="sm" label="Nouvelle promo" icon={<Plus size={16} color={colors.brand.foreground} />} onPress={onNewPromo} />
        </View>

        <AutoGrid min={280} gap={16}>
          {/* Prix du jeton */}
          <View className="gap-3 rounded-lg bg-surface-raised p-4">
            <View className="flex-row items-center gap-2"><Coins size={16} color={colors.brand.DEFAULT} /><Text variant="label" className="font-semibold">Prix d’un jeton</Text></View>
            <View className="flex-row items-center gap-3">
              <View className="h-14 min-w-0 flex-1 flex-row items-center rounded-lg border border-border bg-surface px-4">
                <TextInput accessibilityLabel="Prix d’un jeton en dinars" value={price} onChangeText={setPrice} keyboardType="decimal-pad"
                  style={{ flex: 1, minWidth: 0, width: '100%', color: colors.foreground.DEFAULT, fontSize: 22, fontWeight: '700', outlineStyle: 'none' } as never} />
                <Text variant="label" tone="muted">DT</Text>
              </View>
              <Button label="Enregistrer" disabled={!dirty || !(parsed > 0)} onPress={save} />
            </View>
            <Text variant="caption" tone="subtle">Exemples : 10 jetons = {formatTnd(10 * (parsed || 0))} · 40 jetons = {formatTnd(40 * (parsed || 0))}</Text>
          </View>

          {/* Simulateur */}
          <View className="gap-3 rounded-lg bg-surface-raised p-4">
            <View className="flex-row items-center gap-2"><Calculator size={16} color={colors.info.DEFAULT} /><Text variant="label" className="font-semibold">Simulateur de recharge</Text></View>
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Stepper value={sim} onChange={setSim} min={1} max={500} step={5} suffix="jetons" />
              <View className="items-end">
                {q.discount ? <Text variant="caption" tone="subtle" className="line-through">{formatTnd(q.base)}</Text> : null}
                <Text variant="title">{formatTnd(q.total)}</Text>
                {q.bonus ? <Text variant="caption" tone="success" className="font-semibold">+{q.bonus} jetons offerts</Text> : null}
              </View>
            </View>
            <Text variant="caption" tone="subtle">{q.percentPromo || q.bonusPromo ? `Promo appliquée : ${[q.percentPromo?.title, q.bonusPromo?.title].filter(Boolean).join(' + ')}` : 'Aucune promo applicable à ce montant.'}</Text>
          </View>
        </AutoGrid>

        <View className="gap-3">
          <Text variant="label" className="font-semibold">Promotions ({promos.length})</Text>
          {promos.length ? (
            <AutoGrid min={300} gap={12}>
              {promos.map((p) => <PromoCard key={p.id} p={p} />)}
            </AutoGrid>
          ) : <Text variant="label" tone="muted">Aucune promotion pour cette salle.</Text>}
        </View>
      </View>
    </Appear>
  );
}

function PromoCard({ p }: { p: Promotion }) {
  const { me, run } = useNetwork();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  if (!me) return null;
  const st = STATE[promoState(p)];
  const Icon = p.kind === 'percent_off' ? BadgePercent : Gift;
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} layout={LinearTransition}>
      <View className={cn('gap-3 rounded-lg border p-4', promoState(p) === 'active' ? 'border-energy/40 bg-energy-soft' : 'border-border bg-surface')}>
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-soft"><Icon size={18} color={colors.brand.DEFAULT} /></View>
          <View className="flex-1">
            <Text variant="label" className="font-bold">{p.title}</Text>
            <Text variant="caption" tone="brand" className="font-semibold">{promoLabel(p)}</Text>
          </View>
          <Badge tone={st.tone} label={st.label} />
        </View>
        {p.description ? <Text variant="caption" tone="muted">{p.description}</Text> : null}
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="subtle">Du {dmy(p.startsOn)} au {dmy(p.endsOn)}</Text>
          <View className="flex-row items-center gap-3">
            <Pressable accessibilityRole="switch" accessibilityLabel="Activer la promotion" accessibilityState={{ checked: p.active }} onPress={() => {
              const r = run((d) => setPromotionActive(d, me, p.id, !p.active));
              if (r.ok) toast(p.active ? 'Promotion désactivée' : 'Promotion réactivée', 'info');
            }} className={cn('h-7 w-12 justify-center rounded-full px-1', p.active ? 'bg-success' : 'bg-surface-raised')}>
              <View className={cn('h-5 w-5 rounded-full bg-white', p.active && 'self-end')} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Supprimer la promotion" onPress={() => setConfirm(true)} hitSlop={8}>
              <Trash2 size={18} color={colors.danger.DEFAULT} />
            </Pressable>
          </View>
        </View>
      </View>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Supprimer la promotion ?">
        <View className="w-full max-w-xl gap-3 self-center">
          <Text tone="muted">« {p.title} » ne sera plus appliquée. Les recharges déjà faites ne changent pas.</Text>
          <Button block variant="destructive" label="Supprimer" onPress={() => { run((d) => deletePromotion(d, me, p.id)); setConfirm(false); toast('Promotion supprimée', 'info'); }} />
          <Button block variant="ghost" label="Annuler" onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Animated.View>
  );
}

function PromoSheet({ gym, onClose }: { gym: Gym | null; onClose: () => void }) {
  const { me, run } = useNetwork();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<Promotion['kind']>('percent_off');
  const [value, setValue] = useState(15);
  const [minTokens, setMinTokens] = useState(0);
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => addDays(new Date(), 14));
  const [error, setError] = useState('');
  if (!me) return null;
  const submit = () => {
    if (!gym) return;
    const r = run((d) => createPromotion(d, me, { gymId: gym.id, title, description, kind, value, minTokens, startsOn: ymd(start), endsOn: ymd(end) }));
    if (!r.ok) { setError(r.error); return; }
    toast(`Promotion « ${r.value.title} » créée pour ${gym.name}`);
    setTitle(''); setDescription(''); setError('');
    onClose();
  };
  return (
    <Sheet open={!!gym} onClose={onClose} title={`Nouvelle promo · ${gym?.name ?? ''}`}>
      <ScrollView style={{ maxHeight: 600 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-xl gap-4 self-center">
          <TextField label="Titre" placeholder="Ex. Black Friday" value={title} onChangeText={setTitle} />
          <TextField label="Description (visible par les clients)" placeholder="Ex. 20 % sur toutes les recharges" value={description} onChangeText={setDescription} />
          <ChoiceChips value={kind} onChange={(k) => { setKind(k); setValue(k === 'percent_off' ? 15 : 5); setMinTokens(k === 'percent_off' ? 0 : 20); }}
            options={[{ key: 'percent_off', label: 'Remise en %' }, { key: 'bonus_tokens', label: 'Jetons offerts' }]} />
          <View className="flex-row flex-wrap gap-8">
            <View className="gap-2"><Text variant="label" tone="muted">{kind === 'percent_off' ? 'Remise' : 'Jetons offerts'}</Text>
              <Stepper value={value} onChange={setValue} min={1} max={kind === 'percent_off' ? 90 : 200} step={kind === 'percent_off' ? 5 : 1} suffix={kind === 'percent_off' ? '%' : 'jetons'} /></View>
            <View className="gap-2"><Text variant="label" tone="muted">À partir de (jetons achetés)</Text>
              <Stepper value={minTokens} onChange={setMinTokens} min={kind === 'percent_off' ? 0 : 1} max={500} step={5} suffix={minTokens ? 'jetons min.' : 'dès 1 jeton'} /></View>
          </View>
          <View className="rounded-lg bg-brand-soft p-3"><Text variant="label" tone="brand" className="font-semibold">{promoLabel({ kind, value, minTokens })}</Text></View>
          <View className="flex-row flex-wrap gap-4">
            <View className="min-w-[260px] flex-1 gap-2"><Text variant="label" tone="muted">Début</Text><DatePicker value={start} onChange={(d) => { setStart(d); if (d > end) setEnd(d); }} min={new Date()} /></View>
            <View className="min-w-[260px] flex-1 gap-2"><Text variant="label" tone="muted">Fin</Text><DatePicker value={end} onChange={setEnd} min={start} /></View>
          </View>
          {error ? <Text variant="label" tone="danger">{error}</Text> : null}
          <Button block size="lg" label="Créer la promotion" onPress={submit} />
        </View>
      </ScrollView>
    </Sheet>
  );
}
