import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Mail, Phone, User } from 'lucide-react-native';
import { Avatar, Button, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { BottomBar, Header, TextField } from '@/components/Chrome';
import { useToast } from '@/components/Toast';

/** A22 (suite) — Mes informations : profil progressif, rien d'obligatoire au-delà de l'inscription. */
export default function Account() {
  const { state, updateMember } = useDemo();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: state.member.firstName, lastName: state.member.lastName, email: state.member.email, phone: state.member.phone });
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    setTimeout(() => { updateMember(form); setBusy(false); toast('Informations enregistrées'); router.back(); }, 600);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Mes informations" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-5 self-center px-5">
          <View className="items-center gap-2 py-2">
            <Avatar name={`${form.firstName} ${form.lastName}`} size={72} />
            <Text variant="label" tone="brand" onPress={() => toast('Ajout de photo : disponible dans la version finale', 'info')}>Changer la photo</Text>
          </View>
          <TextField label="Prénom" value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} icon={<User size={18} color={colors.foreground.muted} />} />
          <TextField label="Nom" value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} icon={<User size={18} color={colors.foreground.muted} />} />
          <TextField label="E-mail" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} icon={<Mail size={18} color={colors.foreground.muted} />} />
          <TextField label="Téléphone" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} icon={<Phone size={18} color={colors.foreground.muted} />}
            hint="Utilisé pour les rappels de cours et les codes de vérification." />
          <Text variant="caption" tone="subtle">MILIEU ne demande aucune donnée de santé. Vos informations restent confidentielles.</Text>
        </View>
      </ScrollView>
      <BottomBar><Button block size="lg" label="Enregistrer" loading={busy} onPress={save} /></BottomBar>
    </View>
  );
}
