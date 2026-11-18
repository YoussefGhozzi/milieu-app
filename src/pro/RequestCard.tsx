import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { AlertTriangle, CalendarClock, Check, Coins, MapPin, Repeat, Users, X } from 'lucide-react-native';
import { Avatar, Button, Sheet, Text, colors } from '@milieu/ui';
import type { Course } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { RECURRENCE_LABEL, fullName, occurrenceCount, reviewCourse, roomConflicts } from '@/backend/engine';
import { DisciplineArt } from '@/components/ClassVisuals';
import { useToast } from '@/components/Toast';
import { dayLabel, relative, time } from '@/lib/format';
import { recurrenceSummary } from './courseText';
import { ChoiceChips, CoursePill } from './ui';

const REASONS = ['Studio déjà occupé sur ce créneau', 'Horaire hors ouverture de la salle', 'Nombre de places trop élevé pour le studio', 'Autre raison'];

/** Demande de cours d'un coach, avec validation ou refus motivé par l'accueil. */
export function RequestCard({ course, index = 0 }: { course: Course; index?: number }) {
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const [refuse, setRefuse] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [custom, setCustom] = useState('');
  const coach = db.accounts.find((a) => a.id === course.coachId);
  const conflicts = course.status === 'pending' ? roomConflicts(db, course) : [];
  const total = occurrenceCount(course);

  const decide = (decision: 'approved' | 'rejected') => {
    if (!me) return;
    const note = decision === 'rejected' ? (reason === 'Autre raison' ? custom : `${reason}.${custom.trim() ? ` ${custom.trim()}` : ''}`) : undefined;
    const r = run((d) => reviewCourse(d, me, course.id, decision, note));
    if (!r.ok) { toast(r.error, 'danger'); return; }
    setRefuse(false);
    toast(decision === 'approved' ? `« ${course.title} » validé : visible par tous les clients` : 'Cours refusé, le coach est prévenu', decision === 'approved' ? 'success' : 'info');
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)} exiting={FadeOut.duration(200)} layout={LinearTransition}>
      <View className="overflow-hidden rounded-xl border border-border bg-surface">
        <DisciplineArt disciplineId={course.category} height={84} rounded={0} iconSize={34} />
        <View className="absolute left-4 top-4"><CoursePill status={course.status} /></View>
        <View className="gap-3 p-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={fullName(coach)} size={36} />
            <View className="flex-1">
              <Text variant="heading" numberOfLines={1}>{course.title}</Text>
              <Text variant="caption" tone="muted">par {fullName(coach)} · envoyé {relative(course.createdAt).toLowerCase()}</Text>
            </View>
          </View>
          <Line icon={Repeat} text={`${RECURRENCE_LABEL[course.recurrence]} · ${recurrenceSummary(course)}${course.recurrence !== 'once' ? ` (${total} séances)` : ''}`} />
          <View className="flex-row flex-wrap gap-x-4 gap-y-2">
            <Line icon={CalendarClock} text={`1re : ${dayLabel(course.startsAt)} ${time(course.startsAt)} · ${course.durationMin} min`} />
            <Line icon={MapPin} text={course.room} />
            <Line icon={Users} text={`${course.capacity} places`} />
            <Line icon={Coins} text={`${course.tokenCost} jetons`} />
          </View>
          {course.description ? <Text variant="label" tone="muted" numberOfLines={3}>{course.description}</Text> : null}
          {conflicts.length ? (
            <View className="flex-row gap-2 rounded-lg bg-warning-soft p-3">
              <AlertTriangle size={16} color={colors.warning.DEFAULT} />
              <Text variant="label" className="flex-1">Chevauchement dans {course.room} : {conflicts.slice(0, 2).map((c) => `${c.course.title} (${dayLabel(c.start).toLowerCase()} ${time(c.start)})`).join(', ')}{conflicts.length > 2 ? ` et ${conflicts.length - 2} autre(s)` : ''}.</Text>
            </View>
          ) : null}
          {course.status === 'pending' ? (
            <View className="mt-1 flex-row gap-3">
              <Button className="flex-1" variant="secondary" label="Refuser" icon={<X size={16} color={colors.danger.DEFAULT} />} onPress={() => setRefuse(true)} />
              <Button className="flex-1" label="Valider" icon={<Check size={16} color={colors.brand.foreground} />} onPress={() => decide('approved')} />
            </View>
          ) : course.reviewNote ? <Text variant="caption" tone="muted">Motif : {course.reviewNote}</Text> : null}
        </View>
      </View>

      <Sheet open={refuse} onClose={() => setRefuse(false)} title="Refuser le cours">
        <View className="w-full max-w-xl gap-4 self-center">
          <Text tone="muted">Le coach verra cette raison et pourra proposer à nouveau.</Text>
          <ChoiceChips value={reason} onChange={setReason} options={REASONS.map((r) => ({ key: r, label: r }))} />
          <TextInput multiline value={custom} onChangeText={setCustom} placeholder={reason === 'Autre raison' ? 'Expliquez la raison au coach' : 'Précision ou proposition (facultatif)'}
            placeholderTextColor={colors.foreground.subtle}
            style={{ minHeight: 80, color: colors.foreground.DEFAULT, fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border.DEFAULT, backgroundColor: colors.surface.raised, textAlignVertical: 'top', outlineStyle: 'none' } as never} />
          <Button block variant="destructive" label="Refuser le cours" disabled={reason === 'Autre raison' && !custom.trim()} onPress={() => decide('rejected')} />
          <Button block variant="ghost" label="Annuler" onPress={() => setRefuse(false)} />
        </View>
      </Sheet>
    </Animated.View>
  );
}

function Line({ icon: I, text }: { icon: typeof Users; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <I size={14} color={colors.foreground.muted} />
      <Text variant="label" tone="muted">{text}</Text>
    </View>
  );
}
