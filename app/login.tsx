import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Lock, Mail, Sparkles } from 'lucide-react-native';
import { Button, Text, colors } from '@milieu/ui';
import { BottomBar, TextField } from '@/components/Chrome';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { useDemo } from '@/demo/DemoProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A04 — Connexion (e-mail ou téléphone). Un raccourci remplit le compte de démo. */
export default function Login() {
  const { login, state } = useDemo();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!contact.trim() || password.length < 4) { setError('E-mail, téléphone ou mot de passe incorrect.'); return; }
    setError('');
    setBusy(true);
    setTimeout(() => { login(); toast(`Bon retour, ${state.member.firstName} !`); router.replace('/(tabs)'); }, 800);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-5 self-center px-5">
          <Appear>
            <Text variant="title" tone="brand" className="font-bold">mil!eu</Text>
            <Text variant="display" className="mt-8">Bon retour</Text>
            <Text tone="muted" className="mt-2">Connectez-vous pour réserver vos cours.</Text>
          </Appear>
          <Appear index={1}>
            <TextField label="E-mail ou téléphone" placeholder="nour@exemple.com" autoCapitalize="none" keyboardType="email-address"
              value={contact} onChangeText={setContact} icon={<Mail size={18} color={colors.foreground.muted} />} />
          </Appear>
          <Appear index={2}>
            <TextField label="Mot de passe" placeholder="Votre mot de passe" secure value={password} onChangeText={setPassword}
              error={error} icon={<Lock size={18} color={colors.foreground.muted} />} />
            <Pressable accessibilityRole="link" onPress={() => router.push('/forgot')} className="mt-3 self-end" hitSlop={10}>
              <Text variant="label" tone="brand">Mot de passe oublié ?</Text>
            </Pressable>
          </Appear>
          <Appear index={3}>
            <Pressable accessibilityRole="button" onPress={() => { setContact(state.member.email); setPassword('milieu2026'); setError(''); }}
              className="flex-row items-center gap-3 rounded-lg border border-dashed border-brand/50 bg-brand-soft p-4 active:opacity-80">
              <Sparkles size={18} color={colors.brand.DEFAULT} />
              <View className="flex-1">
                <Text variant="label" className="font-semibold">Utiliser le compte de démo</Text>
                <Text variant="caption" tone="muted">{state.member.firstName} {state.member.lastName} · {state.member.email}</Text>
              </View>
            </Pressable>
          </Appear>
        </View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" label="Se connecter" loading={busy} onPress={submit} />
        <Button block variant="ghost" className="mt-1" label="Créer un compte" onPress={() => router.replace('/register')} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
