import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { Check, Coffee, Copy, Crown, Flame, Gift, Share2, Target, Users } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, Divider, SectionHeader, Sheet, Text, cn, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Header } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';

/* Données de démonstration du programme de fidélité (aucun backend). */
const LEVELS = [
  { name: 'First Timer', from: 0, perk: 'Bonus de bienvenue' },
  { name: 'Regular', from: 5, perk: '1 café offert toutes les 10 séances' },
  { name: 'Insider', from: 20, perk: 'Réservation prioritaire 24 h avant' },
  { name: 'Icon', from: 50, perk: 'Invités gratuits et événements privés' },
];
const TOTAL_SESSIONS = 17;
const CARD_DONE = 7;
const STREAK_WEEKS = [true, true, true, true, false, false];
const REFERRALS = [
  { name: 'Karim T.', status: 'A suivi son premier cours', bonus: 3 },
  { name: 'Lina M.', status: 'Inscrite, pas encore de cours', bonus: 0 },
];
const CHALLENGES = [
  { title: '3 cours cette semaine', done: 2, total: 3, reward: '+2 jetons bonus' },
  { title: 'Essayer une nouvelle discipline', done: 0, total: 1, reward: '+1 jeton bonus' },
];

/** A25–A28 — MILIEU Perks : niveau, carte café, série, défis et parrainage. */
export default function Perks() {
  const toast = useToast();
  const { state } = useDemo();
  const [coffees, setCoffees] = useState(1);
  const [sheet, setSheet] = useState(false);
  const levelIndex = LEVELS.reduce((acc, l, i) => (TOTAL_SESSIONS >= l.from ? i : acc), 0);
  const level = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const progress = next ? (TOTAL_SESSIONS - level.from) / (next.from - level.from) : 1;
  const code = `MILIEU-${state.member.firstName.toUpperCase()}`;
  const streak = STREAK_WEEKS.filter(Boolean).length;

  return (
    <View className="flex-1 bg-background">
      <Header title="MILIEU Perks" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-2xl self-center px-5">
          {/* Niveau */}
          <Appear>
            <View className="rounded-xl bg-brand p-5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text variant="overline" className="text-black">Votre niveau</Text>
                  <Text variant="display" className="text-black">{level.name}</Text>
                </View>
                <View className="h-14 w-14 items-center justify-center rounded-full bg-black"><Crown size={26} color={colors.energy.DEFAULT} /></View>
              </View>
              <View className="mt-4 h-2 overflow-hidden rounded-full bg-black/20">
                <View style={{ width: `${Math.round(progress * 100)}%` }} className="h-2 rounded-full bg-black" />
              </View>
              <Text variant="label" className="mt-2 font-semibold text-black">
                {next ? `${TOTAL_SESSIONS} séances · encore ${next.from - TOTAL_SESSIONS} pour devenir ${next.name}` : `${TOTAL_SESSIONS} séances · niveau maximum`}
              </Text>
            </View>
          </Appear>

          <Appear index={1}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 10 }}>
              {LEVELS.map((l, i) => (
                <View key={l.name} className={cn('w-44 gap-1 rounded-lg border p-3', i === levelIndex ? 'border-energy bg-energy-soft' : 'border-border bg-surface')}>
                  <View className="flex-row items-center justify-between">
                    <Text variant="label" className="font-bold">{l.name}</Text>
                    {i <= levelIndex ? <Check size={16} color={colors.energy.DEFAULT} /> : <Text variant="caption" tone="subtle">{l.from} séances</Text>}
                  </View>
                  <Text variant="caption" tone="muted">{l.perk}</Text>
                </View>
              ))}
            </ScrollView>
          </Appear>

          {/* Carte café */}
          <Appear index={2}>
            <SectionHeader title="Carte café" />
            <Card className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text variant="label" tone="muted">10 séances = 1 café offert + 5 TND de crédit café</Text>
                <Badge tone="success" label={`${CARD_DONE} / 10`} />
              </View>
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 10 }).map((_, i) => {
                  const done = i < CARD_DONE;
                  return (
                    <Animated.View key={i} entering={ZoomIn.delay(300 + i * 60).springify()} style={{ width: '18%', aspectRatio: 1 }}>
                      <View className={cn('flex-1 items-center justify-center rounded-full border-2', done ? 'border-energy bg-energy' : i === 9 ? 'border-dashed border-brand' : 'border-dashed border-border-strong')}>
                        {done ? <Check size={20} color="#000" strokeWidth={3} /> : i === 9 ? <Coffee size={20} color={colors.brand.DEFAULT} /> : <Text variant="label" tone="subtle">{i + 1}</Text>}
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
              <Divider />
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft"><Coffee size={20} color={colors.brand.DEFAULT} /></View>
                <View className="flex-1">
                  <Text variant="body" className="font-semibold">{coffees > 0 ? `${coffees} café offert disponible` : 'Aucun café offert pour l’instant'}</Text>
                  <Text variant="caption" tone="muted">Crédit café : 0 TND · séparé des jetons sport</Text>
                </View>
                <Button size="sm" label="Utiliser" disabled={coffees === 0} onPress={() => setSheet(true)} />
              </View>
            </Card>
          </Appear>

          {/* Série */}
          <Appear index={3}>
            <SectionHeader title="Votre série" />
            <Card className="gap-4">
              <View className="flex-row items-center gap-3">
                <Flame size={32} color={colors.brand.DEFAULT} />
                <View className="flex-1">
                  <Text variant="title">{streak} semaines d’affilée</Text>
                  <Text variant="caption" tone="muted">Au moins un cours par semaine. À 6 semaines : +3 jetons bonus.</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                {STREAK_WEEKS.map((ok, i) => (
                  <View key={i} className="flex-1 items-center gap-1">
                    <View className={cn('h-2 w-full rounded-full', ok ? 'bg-brand' : 'bg-surface-raised')} />
                    <Text variant="caption" tone={ok ? 'default' : 'subtle'}>S{i + 1}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </Appear>

          {/* Défis */}
          <Appear index={4}>
            <SectionHeader title="Défis en cours" />
            <View className="gap-3">
              {CHALLENGES.map((c) => (
                <Card key={c.title} className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <Target size={20} color={colors.energy.DEFAULT} />
                    <Text variant="body" className="flex-1 font-semibold">{c.title}</Text>
                    <Badge tone="brand" label={c.reward} />
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-surface-raised">
                    <View style={{ width: `${(c.done / c.total) * 100}%` }} className="h-2 rounded-full bg-energy" />
                  </View>
                  <Text variant="caption" tone="muted">{c.done} / {c.total}</Text>
                </Card>
              ))}
            </View>
          </Appear>

          {/* Parrainage */}
          <Appear index={5}>
            <SectionHeader title="Parrainage" />
            <Card className="gap-4">
              <View className="flex-row items-center gap-3">
                <Gift size={22} color={colors.brand.DEFAULT} />
                <Text variant="label" tone="muted" className="flex-1">Offrez 2 jetons à un ami. Vous en recevez 3 après son premier cours.</Text>
              </View>
              <View className="flex-row items-center justify-between rounded-lg border border-dashed border-energy bg-energy-soft px-4 py-3">
                <Text variant="heading" className="font-bold tracking-widest">{code}</Text>
                <Copy size={18} color={colors.energy.DEFAULT} onPress={() => toast('Code copié')} />
              </View>
              <View className="flex-row gap-3">
                <Button className="flex-1" variant="secondary" label="Copier" icon={<Copy size={16} color={colors.foreground.DEFAULT} />} onPress={() => toast('Code copié')} />
                <Button className="flex-1" label="Partager" icon={<Share2 size={16} color="#000" />} onPress={() => toast('Lien de parrainage prêt à partager', 'info')} />
              </View>
              <Divider />
              <View className="flex-row items-center gap-2">
                <Users size={16} color={colors.foreground.muted} />
                <Text variant="label" tone="muted">{REFERRALS.length} parrainages</Text>
              </View>
              {REFERRALS.map((r) => (
                <View key={r.name} className="flex-row items-center gap-3">
                  <Avatar name={r.name} size={36} />
                  <View className="flex-1">
                    <Text variant="label" className="font-semibold">{r.name}</Text>
                    <Text variant="caption" tone="muted">{r.status}</Text>
                  </View>
                  {r.bonus ? <Badge tone="success" label={`+${r.bonus} jetons`} /> : <Badge label="En attente" />}
                </View>
              ))}
            </Card>
          </Appear>
        </View>
      </ScrollView>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Votre café offert">
        <View className="items-center gap-4">
          <Text tone="muted" className="text-center">Présentez ce QR au coffee shop MILIEU. Valable pour une boisson au choix.</Text>
          <Animated.View entering={FadeInDown.springify()} style={{ backgroundColor: '#fff', padding: 14, borderRadius: 16 }}>
            <QRCode value={`MILIEU-CAFE-${state.member.id}`} size={170} backgroundColor="#ffffff" color="#000000" />
          </Animated.View>
          <Button block size="lg" label="Marquer comme utilisé" onPress={() => { setCoffees(0); setSheet(false); toast('Café offert utilisé. Bonne dégustation !'); }} />
          <Button block variant="ghost" label="Plus tard" onPress={() => setSheet(false)} />
        </View>
      </Sheet>
    </View>
  );
}
