import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Text, cn, colors } from '@milieu/ui';

/** En-tête d'écran secondaire : bouton retour, titre, action à droite. */
export function Header({ title, right, onBack, transparent }: { title?: string; right?: ReactNode; onBack?: () => void; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8 }} className={cn('flex-row items-center gap-3 px-5 pb-3', !transparent && 'bg-background')}>
      <Pressable
        accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
        className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:bg-surface-raised"
      >
        <ArrowLeft size={20} color={colors.foreground.DEFAULT} />
      </Pressable>
      <Text variant="heading" numberOfLines={1} className="flex-1">{title ?? ''}</Text>
      {right}
    </View>
  );
}

/** Barre d'action fixée en bas (action principale dans la zone du pouce). */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }} className="border-t border-border bg-background/95 px-5 pt-3">
      <View className="w-full max-w-xl self-center">{children}</View>
    </View>
  );
}

/** Champ de saisie : libellé, aide, erreur, mot de passe masquable. */
export function TextField({ label, error, hint, secure, icon, ...props }: TextInputProps & { label: string; error?: string; hint?: string; secure?: boolean; icon?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View className="gap-1.5">
      <Text variant="label" tone="muted">{label}</Text>
      <View className={cn('h-14 flex-row items-center gap-3 rounded-lg border bg-surface px-4', error ? 'border-danger' : focused ? 'border-brand' : 'border-border')}>
        {icon}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.foreground.subtle}
          selectionColor={colors.brand.DEFAULT}
          secureTextEntry={secure && hidden}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={{ flex: 1, color: colors.foreground.DEFAULT, fontSize: 16, height: '100%', outlineStyle: 'none' } as never}
          {...props}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'} hitSlop={10} onPress={() => setHidden(!hidden)}>
            {hidden ? <Eye size={20} color={colors.foreground.muted} /> : <EyeOff size={20} color={colors.foreground.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="caption" tone="danger">{error}</Text> : hint ? <Text variant="caption" tone="subtle">{hint}</Text> : null}
    </View>
  );
}

/** Sélecteur segmenté (onglets internes d'un écran). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-full border border-border bg-surface p-1">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.key)}
            className={cn('h-10 flex-1 items-center justify-center rounded-full', active && 'bg-brand')}>
            <Text variant="label" tone={active ? 'onBrand' : 'muted'} className="font-semibold">{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Case à cocher accessible. */
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} className="flex-row items-start gap-3 py-1">
      <View className={cn('mt-0.5 h-6 w-6 items-center justify-center rounded-md border', checked ? 'border-brand bg-brand' : 'border-border-strong bg-surface')}>
        {checked ? <Text variant="label" tone="onBrand" className="font-bold">✓</Text> : null}
      </View>
      <View className="flex-1">{typeof label === 'string' ? <Text variant="label" tone="muted">{label}</Text> : label}</View>
    </Pressable>
  );
}
