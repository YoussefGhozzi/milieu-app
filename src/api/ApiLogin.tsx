import { fieldError, problemMessage } from '@milieu/contracts';
import { router } from 'expo-router';
import { Info, KeyRound, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, colors } from '@milieu/ui';
import { BottomBar, TextField } from '@/components/Chrome';
import { Logo } from '@/components/Logo';
import { Appear } from '@/components/motion';
import { useToast } from '@/components/Toast';
import { useDemo } from '@/demo/DemoProvider';
import i18n from '@/i18n';

const lang = () => (['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr') as 'fr' | 'en' | 'ar';

/**
 * Connexion à la vraie API : e-mail et mot de passe donnés par l'accueil.
 * Première connexion : le mot de passe temporaire doit être remplacé avant d'entrer dans l'app.
 */
export function ApiLogin() {
  const { signIn, changePassword, mustChangePassword, state } = useDemo();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const changing = !!mustChangePassword;

  const submit = async () => {
    setError(''); setFieldErr(undefined);
    if (!email.trim() || !password) { setError('Indiquez votre e-mail et votre mot de passe.'); return; }
    setBusy(true);
    try {
      const r = await signIn!(email, password);
      if (!r.mustChangePassword) { toast('Bon retour !'); router.replace('/(tabs)'); }
    } catch (e) {
      setError(problemMessage(e, lang()));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setError(''); setFieldErr(undefined);
    if (next.length < 8) { setFieldErr('8 caractères minimum.'); return; }
    if (next !== confirm) { setFieldErr('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      await changePassword!(password, next);
      toast('Mot de passe enregistré. Bienvenue !');
      router.replace('/(tabs)');
    } catch (e) {
      setFieldErr(fieldError(e, 'newPassword'));
      setError(fieldError(e, 'newPassword') ? '' : problemMessage(e, lang()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: 24 }}>
        <View className="w-full max-w-xl gap-5 self-center px-5">
          <Appear>
            <Logo height={30} />
            <Text variant="display" className="mt-8">{changing ? 'Votre mot de passe' : 'Bon retour'}</Text>
            <Text tone="muted" className="mt-2">
              {changing ? `Bienvenue ${state.member.firstName || ''} ! Choisissez votre mot de passe personnel pour remplacer celui donné par l’accueil.` : 'Connectez-vous avec l’e-mail et le mot de passe donnés par l’accueil de votre salle.'}
            </Text>
          </Appear>
          {changing ? (
            <>
              <Appear index={1}>
                <TextField label="Nouveau mot de passe" placeholder="8 caractères minimum" secure value={next} onChangeText={setNext} icon={<KeyRound size={18} color={colors.foreground.muted} />} />
              </Appear>
              <Appear index={2}>
                <TextField label="Confirmer" placeholder="Le même mot de passe" secure value={confirm} onChangeText={setConfirm} error={fieldErr} icon={<Lock size={18} color={colors.foreground.muted} />} />
              </Appear>
            </>
          ) : (
            <>
              <Appear index={1}>
                <TextField label="E-mail" placeholder="nour@exemple.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} icon={<Mail size={18} color={colors.foreground.muted} />} />
              </Appear>
              <Appear index={2}>
                <TextField label="Mot de passe" placeholder="Votre mot de passe" secure value={password} onChangeText={setPassword} icon={<Lock size={18} color={colors.foreground.muted} />} />
              </Appear>
            </>
          )}
          {error ? <Text variant="label" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : null}
          {!changing ? (
            <Appear index={3}>
              <View className="flex-row gap-3 rounded-lg border border-border bg-surface-sunken p-4">
                <Info size={18} color={colors.foreground.muted} />
                <Text variant="caption" tone="muted" className="flex-1">Pas encore de compte, ou mot de passe oublié ? L’accueil de votre salle crée votre compte et vous remet un mot de passe temporaire.</Text>
              </View>
            </Appear>
          ) : null}
        </View>
      </ScrollView>
      <BottomBar>
        {changing
          ? <Button block size="lg" label="Enregistrer et continuer" loading={busy} onPress={savePassword} />
          : <Button block size="lg" label="Se connecter" loading={busy} onPress={submit} />}
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

/** Inscription et mot de passe oublié : avec la vraie API, tout passe par l'accueil de la salle. */
export function ApiFrontDeskOnly({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 48 }}>
      <View className="w-full max-w-xl gap-5 self-center px-5">
        <Logo height={30} />
        <Text variant="display" className="mt-8">{title}</Text>
        <Text tone="muted">Votre compte MILIEU est créé par l’accueil de votre salle, qui vous remet un mot de passe temporaire. Mot de passe oublié ? L’accueil le réinitialise en quelques secondes.</Text>
        <Button block size="lg" label="J’ai mes identifiants" onPress={() => router.replace('/login')} />
      </View>
    </View>
  );
}
