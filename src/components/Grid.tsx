import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { useLayout } from '@/lib/layout';

/** Liste responsive : 1 colonne sur téléphone, 2 colonnes sur tablette et ordinateur. */
export function Grid({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const { cols } = useLayout();
  const items = Children.toArray(children);
  if (cols === 1) return <View style={{ gap }}>{items}</View>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: gap }}>
      {items.map((child, i) => <View key={i} style={{ width: '48.8%' }}>{child}</View>)}
    </View>
  );
}
