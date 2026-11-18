import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarCheck, Camera, Eye, Mail, Phone, Star, Store, Trash2, Users } from 'lucide-react-native';
import { Button, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { coachRating, fullName, updateProfile } from '@/backend/engine';
import { TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { disciplineStyle } from '@/lib/disciplines';
import { CATEGORIES } from '@/pro/courseText';
import { pickProfilePhoto } from '@/pro/photo';
import { CoachAvatar, CoachProfileModal, RatingBadge, RatingSummary, ReviewItem } from '@/pro/Rating';
import { AutoGrid, ChoiceChips, Page, PageHeader, Panel, ROLE_LABEL, StatCard } from '@/pro/ui';

/** Profil du coach : photo, parcours et spécialités visibles par les clients, note et avis reçus. */
export default function CoachProfile() {
  const { me, myGym, db, run } = useNetwork();
  const toast = useToast();
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [specialties, setSpecialties] = useState<string[]>(me?.specialties ?? []);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    if (!me) return { courses: 0, clients: 0, sessions: 0 };
    const mine = db.courses.filter((c) => c.coachId === me.id && c.status === 'approved');
    const tickets = db.tickets.filter((t) => mine.some((c) => c.id === t.courseId) && t.status === 'attended');
    return { courses: mine.length, clients: new Set(tickets.map((t) => t.clientId)).size, sessions: new Set(tickets.map((t) => `${t.courseId}@${t.occurrenceAt}`)).size };
  }, [db, me]);

  if (!me || !myGym) return null;
  const rating = coachRating(db, me.id);
  const toggle = (k: string) => setSpecialties((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const save = () => {
    const r = run((d) => updateProfile(d, me, { phone, bio, specialties }));
    toast(r.ok ? 'Profil enregistré' : r.error, r.ok ? 'success' : 'danger');
  };
  const changePhoto = async () => {
    setBusy(true);
    try {
      const url = await pickProfilePhoto();
      if (url) {
        const r = run((d) => updateProfile(d, me, { photoUrl: url }));
        toast(r.ok ? 'Photo mise à jour' : r.error, r.ok ? 'success' : 'danger');
      }
    } catch { toast('Impossible de charger cette image.', 'danger'); }
    setBusy(false);
  };

  return (
    <Page maxWidth={960}>
      <PageHeader overline={myGym.name} title="Mon profil" right={<Button variant="secondary" label="Voir comme un client" icon={<Eye size={16} color={colors.foreground.DEFAULT} />} onPress={() => setPreview(true)} />} />
      <Appear>
        <View className="mb-6 flex-row flex-wrap items-center gap-5 rounded-xl border border-border bg-surface p-5">
          <View>
            <CoachAvatar coach={me} size={96} />
            <Pressable accessibilityRole="button" accessibilityLabel="Changer la photo" onPress={changePhoto} disabled={busy}
              className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-brand active:opacity-80">
              <Camera size={16} color={colors.brand.foreground} />
            </Pressable>
          </View>
          <View className="min-w-[200px] flex-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-2"><Text variant="title">{fullName(me)}</Text><RatingBadge rating={rating} /></View>
            <View className="flex-row items-center gap-2"><Star size={14} color={colors.brand.DEFAULT} /><Text variant="label" tone="muted">{ROLE_LABEL[me.role]} · compte créé par l’administrateur</Text></View>
            <View className="flex-row items-center gap-2"><Store size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">{myGym.name} · {myGym.city}</Text></View>
            <View className="flex-row items-center gap-2"><Mail size={14} color={colors.foreground.muted} /><Text variant="label" tone="muted">{me.email}</Text></View>
            <View className="mt-2 flex-row flex-wrap gap-3">
              <Button size="sm" variant="outline" label={me.photoUrl ? 'Changer la photo' : 'Ajouter une photo'} loading={busy} icon={<Camera size={14} color={colors.brand.DEFAULT} />} onPress={changePhoto} />
              {me.photoUrl ? <Button size="sm" variant="ghost" label="Retirer" icon={<Trash2 size={14} color={colors.brand.DEFAULT} />} onPress={() => run((d) => updateProfile(d, me, { photoUrl: undefined }))} /> : null}
            </View>
          </View>
        </View>
      </Appear>
      <AutoGrid min={160}>
        <StatCard index={1} icon={Star} label="Note moyenne" value={rating.count ? `${rating.avg.toFixed(1).replace('.', ',')} / 5` : '—'} color="#FBBF24" hint={`${rating.count} évaluation${rating.count > 1 ? 's' : ''}`} />
        <StatCard index={2} icon={CalendarCheck} label="Cours validés" value={stats.courses} />
        <StatCard index={3} icon={Users} label="Clients accueillis" value={stats.clients} color={colors.energy.DEFAULT} />
        <StatCard index={4} icon={Star} label="Séances animées" value={stats.sessions} color={colors.info.DEFAULT} />
      </AutoGrid>

      <Appear index={5}>
        <Panel title="Mon rendement · avis des clients" className="mt-6">
          <RatingSummary rating={rating} />
          {rating.reviews.length ? (
            <View className="mt-5 gap-3">
              {rating.reviews.slice(0, 8).map((r, i) => <Animated.View key={r.id} entering={FadeInDown.delay(i * 50)}><ReviewItem r={r} /></Animated.View>)}
            </View>
          ) : <Text variant="label" tone="muted" className="mt-4">Pas encore d’avis écrit. Les clients vous évaluent à la fin de chaque séance.</Text>}
        </Panel>
      </Appear>

      <Appear index={6}>
        <Panel title="Informations visibles par les clients" className="mt-6">
          <View className="gap-4">
            <TextField label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon={<Phone size={18} color={colors.foreground.muted} />} />
            <View className="gap-2">
              <Text variant="label" tone="muted">Spécialités</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <ChoiceChips key={c.key} value={specialties.includes(c.key) ? c.key : ''} onChange={() => toggle(c.key)} options={[{ key: c.key, label: c.label }]}
                    renderIcon={(k, active) => { const s = disciplineStyle(k); const I = s.icon; return <I size={14} color={active ? colors.brand.foreground : s.color} />; }} />
                ))}
              </View>
            </View>
            <View className="gap-1.5">
              <Text variant="label" tone="muted">Mon parcours</Text>
              <TextInput multiline value={bio} onChangeText={setBio} maxLength={600} placeholder="Votre parcours, vos diplômes, votre style de coaching…" placeholderTextColor={colors.foreground.subtle}
                style={{ minHeight: 110, color: colors.foreground.DEFAULT, fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border.DEFAULT, backgroundColor: colors.surface.sunken, textAlignVertical: 'top', outlineStyle: 'none' } as never} />
            </View>
            <Button label="Enregistrer" onPress={save} className="self-start" />
          </View>
        </Panel>
      </Appear>
      <CoachProfileModal coach={me} open={preview} onClose={() => setPreview(false)} />
    </Page>
  );
}
