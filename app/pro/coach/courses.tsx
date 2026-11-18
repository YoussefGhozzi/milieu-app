import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { CalendarClock, Coins, MapPin, MessageSquareWarning, Plus, Repeat, Users } from 'lucide-react-native';
import { Button, EmptyState, Sheet, Text, colors } from '@milieu/ui';
import type { Course } from '@milieu/contracts';
import { useNetwork } from '@/backend/NetworkProvider';
import { RECURRENCE_LABEL, cancelCourse, listSessions, occurrenceCount } from '@/backend/engine';
import { DisciplineArt } from '@/components/ClassVisuals';
import { useToast } from '@/components/Toast';
import { addDays, dayLabel, time } from '@/lib/format';
import { AutoGrid, ChoiceChips, CoursePill, Page, PageHeader } from '@/pro/ui';
import { recurrenceSummary } from '@/pro/courseText';

type Filter = 'all' | Course['status'];

/** Les cours du coach : demandes en attente, validés, refusés (avec la raison). */
export default function CoachCourses() {
  const { db, me, myGym, run } = useNetwork();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [withdraw, setWithdraw] = useState<Course | null>(null);

  const courses = useMemo(() => (me ? db.courses.filter((c) => c.coachId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [db.courses, me]);
  if (!me || !myGym) return null;
  const count = (s: Course['status']) => courses.filter((c) => c.status === s).length;
  const shown = filter === 'all' ? courses : courses.filter((c) => c.status === filter);

  return (
    <Page>
      <PageHeader overline={myGym.name} title="Mes cours" subtitle="Chaque cours créé part à l’accueil pour validation avant d’être visible par les clients."
        right={<Button label="Créer un cours" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/coach/new')} />} />
      <View className="mb-5">
        <ChoiceChips value={filter} onChange={setFilter} options={[
          { key: 'all', label: `Tous · ${courses.length}` },
          { key: 'pending', label: `En attente · ${count('pending')}` },
          { key: 'approved', label: `Validés · ${count('approved')}` },
          { key: 'rejected', label: `Refusés · ${count('rejected')}` },
        ]} />
      </View>

      {shown.length ? (
        <AutoGrid min={340} gap={16}>
          {shown.map((c, i) => {
            const next = c.status === 'approved' ? listSessions(db, { gymId: c.gymId, coachId: me.id, from: new Date(), to: addDays(new Date(), 400) }).find((s) => s.course.id === c.id) : undefined;
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 50).springify().damping(18)} layout={LinearTransition}>
                <View className="overflow-hidden rounded-xl border border-border bg-surface">
                  <DisciplineArt disciplineId={c.category} height={92} rounded={0} iconSize={36} />
                  <View className="absolute left-4 top-4"><CoursePill status={c.status} /></View>
                  <View className="gap-3 p-4">
                    <Text variant="heading" numberOfLines={1}>{c.title}</Text>
                    <Fact icon={Repeat} text={`${RECURRENCE_LABEL[c.recurrence]} · ${recurrenceSummary(c)}`} />
                    <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                      <Fact icon={CalendarClock} text={`${c.durationMin} min`} />
                      <Fact icon={MapPin} text={c.room} />
                      <Fact icon={Users} text={`${c.capacity} places max`} />
                      <Fact icon={Coins} text={`${c.tokenCost} jetons`} />
                    </View>
                    {c.recurrence !== 'once' ? <Text variant="caption" tone="subtle">{occurrenceCount(c)} séances au total</Text> : null}
                    {c.status === 'rejected' && c.reviewNote ? (
                      <View className="flex-row gap-2 rounded-lg bg-danger-soft p-3">
                        <MessageSquareWarning size={16} color={colors.danger.DEFAULT} />
                        <Text variant="label" className="flex-1">{c.reviewNote}</Text>
                      </View>
                    ) : null}
                    {next ? <Text variant="label" tone="success" className="font-semibold">Prochaine séance : {dayLabel(next.start)} à {time(next.start)} · {next.booked}/{c.capacity} inscrits</Text> : null}
                    {c.status === 'pending' ? <Button size="sm" variant="ghost" label="Retirer la demande" onPress={() => setWithdraw(c)} /> : null}
                    {c.status === 'rejected' ? <Button size="sm" variant="secondary" label="Proposer à nouveau" onPress={() => router.push({ pathname: '/pro/coach/new', params: { from: c.id } })} /> : null}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </AutoGrid>
      ) : (
        <EmptyState icon={<CalendarClock size={28} color={colors.foreground.muted} />} title="Aucun cours ici" body="Créez votre premier cours : il sera envoyé à l’accueil pour validation."
          action={<Button label="Créer un cours" onPress={() => router.push('/pro/coach/new')} />} />
      )}

      <Sheet open={!!withdraw} onClose={() => setWithdraw(null)} title="Retirer la demande ?">
        <View className="w-full max-w-xl gap-3 self-center">
          <Text tone="muted">« {withdraw?.title} » ne sera plus proposé à l’accueil. Vous pourrez le recréer plus tard.</Text>
          <Button block variant="destructive" label="Retirer" onPress={() => {
            const r = run((d) => cancelCourse(d, me, withdraw!.id));
            setWithdraw(null);
            toast(r.ok ? 'Demande retirée' : r.error, r.ok ? 'info' : 'danger');
          }} />
          <Button block variant="ghost" label="Garder" onPress={() => setWithdraw(null)} />
        </View>
      </Sheet>
    </Page>
  );
}

function Fact({ icon: I, text }: { icon: typeof Repeat; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <I size={14} color={colors.foreground.muted} />
      <Text variant="label" tone="muted">{text}</Text>
    </View>
  );
}
