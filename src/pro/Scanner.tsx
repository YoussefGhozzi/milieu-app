import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Camera, CheckCircle2, Keyboard, ScanLine, TicketCheck, XCircle } from 'lucide-react-native';
import { Avatar, Button, Text, TokenAmount, cn, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { checkIn, fullName, type CheckInResult } from '@/backend/engine';
import { Segmented, TextField } from '@/components/Chrome';
import { time } from '@/lib/format';
import { Panel, useBreakpoint } from './ui';

type Outcome = { ok: true; result: CheckInResult } | { ok: false; error: string };

/**
 * Validation de présence : le coach (ses cours) ou l'accueil (toute la salle) scanne le QR du client.
 * Présence validée → jetons réservés définitivement débités.
 */
export function Scanner() {
  const { me, db, run } = useNetwork();
  const { wide } = useBreakpoint();
  const [mode, setMode] = useState<'camera' | 'code'>(Platform.OS === 'web' ? 'code' : 'camera');
  const [code, setCode] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const lock = useRef(false);

  const validate = (raw: string) => {
    if (!me || lock.current) return;
    lock.current = true;
    const r = run((d) => checkIn(d, me, raw));
    setOutcome(r.ok ? { ok: true, result: r.value } : { ok: false, error: r.error });
    if (r.ok) setCode('');
  };
  const next = () => { setOutcome(null); setTimeout(() => { lock.current = false; }, 400); };

  // Liste de présence : réservations validables maintenant (fenêtre du scan).
  const roster = useMemo(() => {
    if (!me) return [];
    const now = Date.now();
    return db.tickets
      .filter((t) => t.gymId === me.gymId && (t.status === 'booked' || t.status === 'attended'))
      .map((t) => ({ t, course: db.courses.find((c) => c.id === t.courseId)!, client: db.accounts.find((a) => a.id === t.clientId) }))
      .filter(({ t, course }) => course && (me.role !== 'coach' || course.coachId === me.id)
        && new Date(t.occurrenceAt).getTime() - 12 * 3600e3 <= now && new Date(t.occurrenceAt).getTime() + (course.durationMin + 60) * 60e3 >= now)
      .sort((a, b) => a.t.occurrenceAt.localeCompare(b.t.occurrenceAt));
  }, [db, me]);

  return (
    <View className={cn('gap-5', wide && 'flex-row items-start')}>
      <View className={cn('gap-4', wide ? 'flex-1' : 'w-full')}>
        <Segmented value={mode} onChange={setMode} options={[{ key: 'camera', label: 'Caméra' }, { key: 'code', label: 'Saisir le code' }]} />
        {mode === 'camera' ? <CameraPane onCode={validate} paused={!!outcome} /> : (
          <Animated.View entering={FadeIn} className="gap-4 rounded-xl border border-border bg-surface p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft"><Keyboard size={20} color={colors.brand.DEFAULT} /></View>
              <View className="flex-1">
                <Text variant="heading">Code du ticket</Text>
                <Text variant="caption" tone="muted">Écrit sous le QR du client, ex. MLU-NOUR-FLOW</Text>
              </View>
            </View>
            <TextField label="Code" placeholder="MLU-XXXX-XXXX" autoCapitalize="characters" value={code} onChangeText={setCode}
              onSubmitEditing={() => validate(code)} icon={<TicketCheck size={18} color={colors.foreground.muted} />} />
            <Button block size="lg" label="Valider la présence" disabled={!code.trim()} onPress={() => validate(code)} />
          </Animated.View>
        )}
      </View>

      <View className={wide ? 'w-[380px]' : 'w-full'}>
        <Panel title="Présences du moment">
          {roster.length ? (
            <View className="gap-1">
              {roster.map(({ t, course, client }) => (
                <View key={t.id} className="flex-row items-center gap-3 py-2">
                  <Avatar name={fullName(client)} size={38} />
                  <View className="flex-1">
                    <Text variant="label" className="font-semibold">{fullName(client)}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{course.title} · {time(t.occurrenceAt)}</Text>
                  </View>
                  {t.status === 'attended'
                    ? <View className="flex-row items-center gap-1"><CheckCircle2 size={16} color={colors.success.DEFAULT} /><Text variant="caption" tone="success" className="font-semibold">Présent</Text></View>
                    : <Button size="sm" variant="secondary" label="Valider" onPress={() => validate(t.code)} />}
                </View>
              ))}
              <Text variant="caption" tone="subtle" className="mt-2">« Valider » sert si le client n’a pas son téléphone. Le scan reste la voie normale.</Text>
            </View>
          ) : <Text variant="label" tone="muted">Aucune réservation à valider pour l’instant. Les tickets apparaissent ici 12 h avant la séance.</Text>}
        </Panel>
      </View>

      {outcome ? <ResultOverlay outcome={outcome} onNext={next} /> : null}
    </View>
  );
}

function CameraPane({ onCode, paused }: { onCode: (c: string) => void; paused: boolean }) {
  const [perm, request] = useCameraPermissions();
  const line = useSharedValue(0);
  useEffect(() => { line.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true); }, [line]);
  const lineStyle = useAnimatedStyle(() => ({ top: `${8 + line.value * 84}%` }));

  if (!perm) return <View className="aspect-square w-full rounded-xl bg-surface" />;
  if (!perm.granted) {
    return (
      <View className="items-center gap-4 rounded-xl border border-border bg-surface p-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft"><Camera size={28} color={colors.brand.DEFAULT} /></View>
        <Text variant="heading" className="text-center">Autoriser la caméra</Text>
        <Text tone="muted" className="text-center">La caméra sert uniquement à lire le QR code du ticket client.</Text>
        <Button label="Autoriser" onPress={request} />
      </View>
    );
  }
  return (
    <View className="w-full max-w-[520px] self-center overflow-hidden rounded-xl border border-border bg-black" style={{ aspectRatio: 1 }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={paused ? undefined : (e) => onCode(e.data)} />
      <View pointerEvents="none" className="absolute inset-[12%] rounded-2xl border-2 border-white/80" />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '14%', right: '14%', height: 2, backgroundColor: colors.brand.DEFAULT }, lineStyle]} />
      <View pointerEvents="none" className="absolute bottom-4 left-0 right-0 flex-row items-center justify-center gap-2">
        <ScanLine size={16} color="#fff" />
        <Text variant="label" className="font-semibold text-white">Placez le QR dans le cadre</Text>
      </View>
    </View>
  );
}

function ResultOverlay({ outcome, onNext }: { outcome: Outcome; onNext: () => void }) {
  useEffect(() => {
    if (!outcome.ok) return;
    const t = setTimeout(onNext, 3500);
    return () => clearTimeout(t);
  }, [outcome, onNext]);
  return (
    <Modal visible transparent animationType="none" onRequestClose={onNext}>
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} className="flex-1 items-center justify-center bg-black/70 p-5">
      <Pressable className="absolute inset-0" onPress={onNext} accessibilityLabel="Fermer" />
      <Animated.View entering={ZoomIn.springify().damping(15)} className="w-full max-w-sm items-center gap-4 rounded-xl border border-border bg-surface p-6">
        {outcome.ok ? (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-success-soft"><CheckCircle2 size={44} color={colors.success.DEFAULT} /></View>
            <Text variant="title" className="text-center">Présence validée</Text>
            <View className="items-center gap-1">
              <Text variant="heading">{fullName(outcome.result.client)}</Text>
              <Text variant="label" tone="muted">{outcome.result.course.title} · {time(outcome.result.ticket.occurrenceAt)}</Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-full bg-surface-raised px-4 py-2">
              <TokenAmount value={outcome.result.ticket.tokenCost} size="sm" />
              <Text variant="label" tone="muted">jetons débités</Text>
            </View>
            <Button block label="Scanner le suivant" onPress={onNext} />
          </>
        ) : (
          <>
            <View className="h-20 w-20 items-center justify-center rounded-full bg-danger-soft"><XCircle size={44} color={colors.danger.DEFAULT} /></View>
            <Text variant="title" className="text-center">Ticket refusé</Text>
            <Text tone="muted" className="text-center">{outcome.error}</Text>
            <Button block variant="secondary" label="Réessayer" onPress={onNext} />
          </>
        )}
      </Animated.View>
    </Animated.View>
    </Modal>
  );
}
