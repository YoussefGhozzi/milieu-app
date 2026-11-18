import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Building2, MapPin, Plus, X } from 'lucide-react-native';
import { Badge, Button, Sheet, Text, colors } from '@milieu/ui';
import { useNetwork } from '@/backend/NetworkProvider';
import { activePromotions, createGym, formatTnd } from '@/backend/engine';
import { TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { AutoGrid, ChoiceChips, Page, PageHeader } from '@/pro/ui';

/** Les salles du réseau et l'ouverture d'une nouvelle salle. */
export default function Gyms() {
  const { db, me, run } = useNetwork();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', address: '' });
  const [rooms, setRooms] = useState<string[]>(['Studio 1']);
  const [room, setRoom] = useState('');
  const [cancelHours, setCancelHours] = useState(24);
  const [price, setPrice] = useState('10');
  const [error, setError] = useState('');
  if (!me) return null;

  const submit = () => {
    const r = run((d) => createGym(d, me, { ...form, rooms, cancelHours, tokenPriceTnd: Number(price.replace(',', '.')) }));
    if (!r.ok) { setError(r.error); return; }
    toast(`${r.value.name} est ouverte`);
    setOpen(false); setForm({ name: '', city: '', address: '' }); setRooms(['Studio 1']); setError('');
  };

  return (
    <Page>
      <PageHeader overline="Administration" title="Salles" subtitle="Chaque salle a son accueil, ses coachs, ses clients et ses studios."
        right={<Button label="Nouvelle salle" icon={<Plus size={18} color={colors.brand.foreground} />} onPress={() => setOpen(true)} />} />
      <AutoGrid min={300}>
        {db.gyms.map((g, i) => (
          <Appear key={g.id} index={i}>
            <View className="gap-3 rounded-xl border border-border bg-surface p-5">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft"><Building2 size={20} color={colors.brand.DEFAULT} /></View>
              <Text variant="heading">{g.name}</Text>
              <View className="flex-row items-center gap-1.5"><MapPin size={13} color={colors.foreground.muted} /><Text variant="label" tone="muted">{g.address || g.city}</Text></View>
              <View className="flex-row flex-wrap gap-2">{g.rooms.map((r) => <Badge key={r} label={r} />)}</View>
              <View className="flex-row flex-wrap gap-2">
                <Badge tone="brand" label={`1 jeton = ${formatTnd(g.tokenPriceTnd)}`} />
                {activePromotions(db, g.id).length ? <Badge tone="success" label={`${activePromotions(db, g.id).length} promo en cours`} /> : null}
              </View>
              <Text variant="caption" tone="subtle">Annulation gratuite jusqu’à {g.cancelHours} h avant la séance</Text>
            </View>
          </Appear>
        ))}
      </AutoGrid>

      <Sheet open={open} onClose={() => setOpen(false)} title="Nouvelle salle">
        <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
          <View className="w-full max-w-xl gap-3 self-center">
            <TextField label="Nom" placeholder="MILIEU Sfax" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <View className="flex-row gap-3">
              <View className="flex-1"><TextField label="Ville" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} /></View>
              <View className="flex-[2]"><TextField label="Adresse" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} /></View>
            </View>
            <Text variant="label" tone="muted">Studios</Text>
            <View className="flex-row flex-wrap gap-2">
              {rooms.map((r) => (
                <View key={r} className="flex-row items-center gap-1.5 rounded-full bg-surface-raised py-1.5 pl-3 pr-2">
                  <Text variant="label">{r}</Text>
                  <X size={14} color={colors.foreground.muted} onPress={() => setRooms((x) => x.filter((y) => y !== r))} />
                </View>
              ))}
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-1"><TextField label="Ajouter un studio" value={room} onChangeText={setRoom} onSubmitEditing={() => { if (room.trim()) { setRooms((x) => [...x, room.trim()]); setRoom(''); } }} /></View>
              <Button variant="secondary" label="Ajouter" onPress={() => { if (room.trim()) { setRooms((x) => [...x, room.trim()]); setRoom(''); } }} />
            </View>
            <TextField label="Prix d’un jeton (DT)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} hint="Modifiable ensuite dans Tarifs & promos" />
            <Text variant="label" tone="muted">Annulation gratuite jusqu’à</Text>
            <ChoiceChips value={cancelHours} onChange={setCancelHours} options={[12, 24, 48].map((h) => ({ key: h, label: `${h} h avant` }))} />
            {error ? <Text variant="label" tone="danger">{error}</Text> : null}
            <Button block size="lg" label="Créer la salle" onPress={submit} />
          </View>
        </ScrollView>
      </Sheet>
    </Page>
  );
}
