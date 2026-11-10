import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Lock, Mail, User } from 'lucide-react-native';
import { Button, Text, colors } from '@milieu/ui';
import { BottomBar, Checkbox, Header, TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { useDemo } from '@/demo/DemoProvider';

/** A03 — Inscription rapide : 3 champs + consentements, le profil se complète plus tard. */
export default function Register() {
  const { register } = useDemo();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: '', contact: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [news, setNews] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = () => {
    const e: Record<string, string> = {};
    if (form.firstName.trim().length < 2) e.firstName = 'Indiquez votre prénom.';
    const c = form.contact.trim();
    if (!/^\S+@\S+\.\S+$/.test(c) && !/^\+?[\d\s]{8,}$/.test(c)) e.contact = 'Saisissez un e-mail ou un numéro de téléphone valide.';
    if (form.password.length < 8) e.password = 'Au moins 8 caractères.';
    if (!terms) e.terms = 'Acceptez les conditions pour continuer.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setTimeout(() => {
      register(form.firstName.trim(), c);
      toast(`Bienvenue chez MILIEU, ${form.firstName.trim()} !`);
      router.replace('/(tabs)');
    }, 900);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <Header onBack={() => router.replace('/welcome')} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-5 self-center px-5">
          <Appear>
            <Text variant="display">Créer un compte</Text>
            <Text tone="muted" className="mt-2">30 secondes, et votre premier cours vous attend.</Text>
          </Appear>
          <Appear index={1}>
            <TextField label="Prénom" placeholder="Nour" autoComplete="given-name" value={form.firstName}
              onChangeText={(v) => setForm({ ...form, firstName: v })} error={errors.firstName}
              icon={<User size={18} color={colors.foreground.muted} />} />
          </Appear>
          <Appear index={2}>
            <TextField label="E-mail ou téléphone" placeholder="nour@exemple.com ou +216 …" autoCapitalize="none" keyboardType="email-address"
              value={form.contact} onChangeText={(v) => setForm({ ...form, contact: v })} error={errors.contact}
              icon={<Mail size={18} color={colors.foreground.muted} />} />
          </Appear>
          <Appear index={3}>
            <TextField label="Mot de passe" placeholder="8 caractères minimum" secure value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })} error={errors.password} hint="Utilisez au moins 8 caractères."
              icon={<Lock size={18} color={colors.foreground.muted} />} />
          </Appear>
          <Appear index={4}>
            <View className="gap-2 rounded-lg border border-border bg-surface p-4">
              <Checkbox checked={terms} onChange={setTerms} label="J’accepte les conditions d’utilisation et la politique de confidentialité de MILIEU." />
              {errors.terms ? <Text variant="caption" tone="danger">{errors.terms}</Text> : null}
              <Checkbox checked={news} onChange={setNews} label="Je souhaite recevoir les nouveautés et offres du studio (facultatif)." />
            </View>
          </Appear>
        </View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" label="Créer mon compte" loading={busy} onPress={submit} />
        <Button block variant="ghost" className="mt-1" label="J’ai déjà un compte" onPress={() => router.replace('/login')} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
