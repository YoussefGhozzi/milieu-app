import { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { CalendarCheck, Clock3, Hourglass, Percent, Plus, ScanLine, Star, Users } from 'lucide-react-native';
import { Badge, Button, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { coachRating, listSessions, RECURRENCE_LABEL } from '@/backend/engine';
import { DisciplineArt } from '@/components/ClassVisuals';
import { Appear } from '@/components/motion';
import { addDays, dayLabel, dayLong, hoursUntil, time } from '@/lib/format';
import { SessionCard, startOfWeek } from '@/pro/Calendar';
import { AutoGrid, CoursePill, Page, PageHeader, Panel, StatCard } from '@/pro/ui';
import { openSession } from '@/pro/nav';

/** Tableau de bord du coach : prochaine séance, chiffres clés, demandes en cours. */
export default function CoachHome() {
  const { db, me, myGym } = useNetwork();
  const now = new Date();

  const data = useMemo(() => {
    if (!me || !myGym) return null;
    const week = startOfWeek(now);
    const upcoming = listSessions(db, { gymId: myGym.id, coachId: me.id, from: now, to: addDays(now, 30) });
    const thisWeek = listSessions(db, { gymId: myGym.id, coachId: me.id, from: week, to: addDays(week, 7) });
    const myCourses = db.courses.filter((c) => c.coachId === me.id);
    const myTickets = db.tickets.filter((t) => myCourses.some((c) => c.id === t.courseId));
    const attended = myTickets.filter((t) => t.status === 'attended').length;
    const missed = myTickets.filter((t) => t.status === 'no_show').length;
    return {
      upcoming,
      today: upcoming.filter((s) => s.start.toDateString() === now.toDateString()),
      thisWeek: thisWeek.length,
      booked7: upcoming.filter((s) => s.start < addDays(now, 7)).reduce((n, s) => n + s.booked, 0),
      pending: myCourses.filter((c) => c.status === 'pending').length,
      rate: attended + missed ? Math.round((attended / (attended + missed)) * 100) : null,
      recent: [...myCourses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    };
  }, [db, me, myGym]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me || !myGym || !data) return null;
  const rating = coachRating(db, me.id);
  const next = data.upcoming[0];
  const h = next ? hoursUntil(next.start.toISOString()) : 0;
  const countdown = !next ? '' : h < 1 ? `Dans ${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `Dans ${Math.round(h)} h` : dayLabel(next.start);

  return (
    <Page>
      <PageHeader overline={myGym.name} title={`Bonjour ${me.firstName}`} subtitle={dayLong(now)}
        right={<Button label="Créer un cours" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/coach/new')} />} />

      <AutoGrid min={160}>
        <StatCard index={0} icon={CalendarCheck} label="Séances cette semaine" value={data.thisWeek} hint="Vos cours validés" />
        <StatCard index={1} icon={Users} label="Inscrits (7 jours)" value={data.booked7} color={colors.energy.DEFAULT} hint="Places réservées à venir" />
        <StatCard index={2} icon={Hourglass} label="En attente" value={data.pending} color={colors.warning.DEFAULT} hint="Demandes envoyées à l’accueil" onPress={() => router.push('/pro/coach/courses')} />
        <StatCard index={3} icon={Percent} label="Taux de présence" value={data.rate === null ? '—' : `${data.rate} %`} color={colors.info.DEFAULT} hint="Présents / (présents + absents)" />
        <StatCard index={4} icon={Star} label="Note moyenne" value={rating.count ? rating.avg.toFixed(1).replace('.', ',') : '—'} color="#FBBF24" hint={`${rating.count} avis clients`} onPress={() => router.push('/pro/coach/profile')} />
      </AutoGrid>

      <View className="mt-6">
        <AutoGrid min={360} gap={20}>
          <Appear index={4}>
            <Panel title="Votre prochaine séance">
              {next ? (
                <View>
                  <View className="overflow-hidden rounded-xl border border-border">
                    <DisciplineArt disciplineId={next.course.category} height={130} rounded={0} iconSize={48} />
                    <View className="absolute left-4 top-4"><Badge tone="brand" label={countdown} /></View>
                    <View className="gap-3 bg-surface p-4">
                      <View>
                        <Text variant="title">{next.course.title}</Text>
                        <Text variant="label" tone="muted" className="mt-1 capitalize">{dayLong(next.start)} · {time(next.start)}–{time(next.end)} · {next.course.room}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Users size={16} color={colors.foreground.muted} />
                        <Text variant="label" className="font-semibold">{next.booked} inscrit{next.booked > 1 ? 's' : ''}</Text>
                        <Text variant="label" tone="muted">sur {next.course.capacity} places</Text>
                      </View>
                      <View className="flex-row gap-3">
                        <Button className="flex-1" variant="secondary" label="Liste de présence" onPress={() => openSession(next)} />
                        <Button className="flex-1" label="Scanner" icon={<ScanLine size={18} color={colors.brand.foreground} />} onPress={() => router.push('/pro/coach/scan')} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="items-center gap-3 py-6">
                  <Clock3 size={26} color={colors.foreground.subtle} />
                  <Text tone="muted" className="text-center">Aucune séance prévue. Proposez un cours à l’accueil.</Text>
                  <Button size="sm" label="Créer un cours" onPress={() => router.push('/pro/coach/new')} />
                </View>
              )}
            </Panel>
          </Appear>

          <Appear index={5}>
            <View className="gap-5">
              <Panel title="Aujourd’hui" action="Calendrier" onAction={() => router.push('/pro/coach/calendar')}>
                {data.today.length ? (
                  <View className="gap-3">{data.today.map((s) => <SessionCard key={s.key} s={s} onPress={() => openSession(s)} />)}</View>
                ) : <Text variant="label" tone="muted">Pas d’autre séance aujourd’hui.</Text>}
              </Panel>
              <Panel title="Mes dernières demandes" action="Tout voir" onAction={() => router.push('/pro/coach/courses')}>
                <View className="gap-3">
                  {data.recent.map((c) => (
                    <View key={c.id} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <Text variant="label" className="font-semibold" numberOfLines={1}>{c.title}</Text>
                        <Text variant="caption" tone="muted">{RECURRENCE_LABEL[c.recurrence]} · {dayLabel(c.startsAt)} {time(c.startsAt)}</Text>
                      </View>
                      <CoursePill status={c.status} />
                    </View>
                  ))}
                  {!data.recent.length ? <Text variant="label" tone="muted">Aucune demande pour l’instant.</Text> : null}
                </View>
              </Panel>
            </View>
          </Appear>
        </AutoGrid>
      </View>
    </Page>
  );
}
