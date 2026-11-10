import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { Card, Divider, ListRow, SectionHeader, Text, colors } from '@milieu/ui';
import { useDemo } from '@/demo/DemoProvider';
import { Header } from '@/components/Chrome';
import { useToast } from '@/components/Toast';

const FAQ = [
  { q: 'Comment fonctionnent les M Tokens ?', a: 'Vous achetez un pack de jetons, puis chaque cours coûte un nombre fixe de jetons : Lagree 4, Hot Sculpt et Functional 3, Mat Pilates et Mobility 2. Les jetons achetés n’expirent pas.' },
  { q: 'Jusqu’à quand puis-je annuler ?', a: 'L’annulation est gratuite jusqu’à 12 h avant le cours : vos jetons sont remboursés immédiatement. Après, ou en cas d’absence, les jetons sont perdus.' },
  { q: 'Comment marche la liste d’attente ?', a: 'Si un cours est complet, rejoignez la liste : aucun jeton n’est débité. Si une place se libère, vous êtes inscrit automatiquement et prévenu par notification.' },
  { q: 'Que faire à mon arrivée ?', a: 'Arrivez 10 minutes avant et présentez votre QR à l’accueil, depuis l’onglet Réservations. La salle Lagree compte 5 machines : la ponctualité compte !' },
  { q: 'Les bonus expirent-ils ?', a: 'Oui, les jetons bonus ont une durée limitée, affichée dans votre portefeuille. Ils sont utilisés en premier pour ne jamais être perdus.' },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? '180deg' : '0deg') }] }));
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} className="min-h-14 flex-row items-center gap-3 py-3">
        <Text variant="body" className="flex-1 font-semibold">{q}</Text>
        <Animated.View style={chevron}><ChevronDown size={18} color={colors.foreground.muted} /></Animated.View>
      </Pressable>
      {open ? <Animated.View entering={FadeIn.duration(250)}><Text variant="label" tone="muted" className="pb-4 leading-5">{a}</Text></Animated.View> : null}
    </View>
  );
}

/** A24 — Aide : FAQ, règles du studio, contact, mentions. */
export default function Help() {
  const { studio } = useDemo();
  const toast = useToast();
  return (
    <View className="flex-1 bg-background">
      <Header title="Aide et contact" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="w-full max-w-xl self-center px-5">
          <SectionHeader title="Questions fréquentes" />
          <Card className="py-1">
            {FAQ.map((f, i) => <View key={f.q}>{i > 0 ? <Divider /> : null}<Faq q={f.q} a={f.a} /></View>)}
          </Card>

          <SectionHeader title="Règles du studio" />
          <Card className="gap-2">
            {['Arrivez 10 minutes avant le début du cours.', 'Chaussettes antidérapantes obligatoires en salle Lagree.', 'Une serviette et une bouteille d’eau par personne.', `Annulation gratuite jusqu’à ${studio.cancelHours} h avant le cours.`].map((r) => (
              <Text key={r} variant="label" tone="muted">• {r}</Text>
            ))}
          </Card>

          <SectionHeader title="Nous joindre" />
          <Card className="py-1">
            <ListRow icon={<MessageCircle size={18} color={colors.success.DEFAULT} />} title="WhatsApp" subtitle="Réponse en moins d’une heure" onPress={() => toast('Ouverture de WhatsApp…', 'info')} />
            <Divider />
            <ListRow icon={<Phone size={18} color={colors.brand.DEFAULT} />} title="Téléphone" subtitle="+216 70 000 000" onPress={() => toast('Appel du studio…', 'info')} />
            <Divider />
            <ListRow icon={<Mail size={18} color={colors.brand.DEFAULT} />} title="E-mail" subtitle="hello@milieu.tn" onPress={() => toast('Ouverture de votre messagerie…', 'info')} />
            <Divider />
            <ListRow icon={<MapPin size={18} color={colors.brand.DEFAULT} />} title="Adresse" subtitle={studio.address} onPress={() => toast('Ouverture de la carte…', 'info')} />
            <Divider />
            <ListRow icon={<Clock size={18} color={colors.brand.DEFAULT} />} title="Horaires" subtitle="Lun–sam 6:30–21:30 · dim 8:00–14:00" chevron={false} />
          </Card>

          <View className="mt-6 flex-row justify-center gap-6">
            <Text variant="caption" tone="subtle" onPress={() => toast('Conditions d’utilisation', 'info')}>Conditions d’utilisation</Text>
            <Text variant="caption" tone="subtle" onPress={() => toast('Politique de confidentialité', 'info')}>Confidentialité</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
