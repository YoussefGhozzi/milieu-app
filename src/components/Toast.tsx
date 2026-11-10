import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { Text, colors } from '@milieu/ui';

type Tone = 'success' | 'info' | 'danger';
interface ToastItem { id: number; message: string; tone: Tone }

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Messages courts en haut de l'écran (confirmation d'une action, information). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, tone: Tone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setItem({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setItem(null), 2800);
  }, []);

  const Icon = item?.tone === 'danger' ? AlertCircle : item?.tone === 'info' ? Info : CheckCircle2;
  const color = item?.tone === 'danger' ? colors.danger.DEFAULT : item?.tone === 'info' ? colors.info.DEFAULT : colors.success.DEFAULT;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {item ? (
        <Animated.View
          key={item.id}
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp.duration(200)}
          pointerEvents="none"
          style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, alignItems: 'center' }}
        >
          <View accessibilityLiveRegion="polite" className="w-full max-w-md flex-row items-center gap-3 rounded-lg border border-border-strong bg-surface-raised px-4 py-3">
            <Icon size={20} color={color} />
            <Text variant="label" className="flex-1">{item.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
