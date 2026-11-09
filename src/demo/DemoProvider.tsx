import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { buildDemoState, studio, walletTotal, type DemoState } from '@milieu/contracts';

/*
 * État de la démo, en mémoire : aucun backend, aucune règle métier.
 * Les écrans lisent ces données simulées ; les actions (réserver, annuler, acheter) seront de simples
 * mises à jour d'affichage branchées ici au fil des tickets, puis remplacées par l'API en phase 2.
 */
interface DemoContextValue {
  state: DemoState;
  setState: Dispatch<SetStateAction<DemoState>>;
  studio: typeof studio;
  balance: number;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => buildDemoState());
  const value = useMemo(() => ({ state, setState, studio, balance: walletTotal(state.wallet) }), [state]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo doit être utilisé dans <DemoProvider>');
  return ctx;
}
