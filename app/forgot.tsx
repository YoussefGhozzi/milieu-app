import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight, ZoomIn } from 'react-native-reanimated';
import { CheckCircle2, Lock, Mail } from 'lucide-react-native';
import { Button, Text, cn, colors } from '@milieu/ui';
import { BottomBar, Header, TextField } from '@/components/Chrome';
import { useToast } from '@/components/Toast';

/** A05 — Mot de passe oublié : e-mail → code à 6 chiffres → nouveau mot de passe → terminé. */
export default function Forgot() {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const wait = (fn: () => void) => { setBusy(true); setTimeout(() => { setBusy(false); fn(); }, 700); };
  const next = () => {
    setError('');
    if (step === 1) { if (!contact.trim()) return setError('Saisissez votre e-mail ou téléphone.'); wait(() => { setStep(2); toast('Code envoyé (démo : n’importe quels 6 chiffres)', 'info'); }); }
    else if (step === 2) { if (code.length !== 6) return setError('Le code contient 6 chiffres.'); wait(() => setStep(3)); }
    else if (step === 3) { if (pwd.length < 8) return setError('Au moins 8 caractères.'); wait(() => setStep(4)); }
    else router.replace('/login');
  };

  const titles = { 1: 'Mot de passe oublié', 2: 'Vérifiez vos messages', 3: 'Nouveau mot de passe', 4: 'C’est fait' } as const;
  const bodies = {
    1: 'Indiquez l’e-mail ou le numéro de votre compte : nous vous envoyons un code.',
    2: `Saisissez le code à 6 chiffres envoyé à ${contact || 'votre adresse'}.`,
    3: 'Choisissez un nouveau mot de passe d’au moins 8 caractères.',
    4: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.',
  } as const;

  return (
    <View className="flex-1 bg-background">
      <Header onBack={() => (step > 1 && step < 4 ? setStep((step - 1) as 1 | 2 | 3) : router.back())} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={FadeInRight.duration(350)}>
        <View className="w-full max-w-xl gap-6 self-center px-5">
          <View className="flex-row gap-2">
            {[1, 2, 3].map((n) => <View key={n} className={cn('h-1 flex-1 rounded-full', n <= Math.min(step, 3) ? 'bg-brand' : 'bg-surface-raised')} />)}
          </View>
          {step === 4 ? (
            <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', paddingVertical: 24 }}>
              <CheckCircle2 size={72} color={colors.success.DEFAULT} strokeWidth={1.5} />
            </Animated.View>
          ) : null}
          <View>
            <Text variant="display">{titles[step]}</Text>
            <Text tone="muted" className="mt-2">{bodies[step]}</Text>
          </View>
          {step === 1 ? (
            <TextField label="E-mail ou téléphone" autoCapitalize="none" keyboardType="email-address" value={contact} onChangeText={setContact}
              error={error} icon={<Mail size={18} color={colors.foreground.muted} />} />
          ) : null}
          {step === 2 ? (
            <View className="gap-2">
              <View className="flex-row justify-between gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} className={cn('h-14 flex-1 items-center justify-center rounded-lg border bg-surface', code.length === i ? 'border-brand' : 'border-border')}>
                    <Text variant="title">{code[i] ?? ''}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Code à 6 chiffres" autoFocus keyboardType="number-pad" maxLength={6} value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                style={{ position: 'absolute', inset: 0, opacity: 0.01, color: 'transparent' } as never}
              />
              {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
              <Text variant="label" tone="brand" onPress={() => toast('Nouveau code envoyé', 'info')} className="mt-2">Renvoyer le code</Text>
            </View>
          ) : null}
          {step === 3 ? (
            <TextField label="Nouveau mot de passe" secure value={pwd} onChangeText={setPwd} error={error}
              icon={<Lock size={18} color={colors.foreground.muted} />} />
          ) : null}
        </View>
        </Animated.View>
      </ScrollView>
      <BottomBar>
        <Button block size="lg" loading={busy} label={step === 1 ? 'Envoyer le code' : step === 2 ? 'Vérifier' : step === 3 ? 'Enregistrer' : 'Se connecter'} onPress={next} />
      </BottomBar>
    </View>
  );
}
