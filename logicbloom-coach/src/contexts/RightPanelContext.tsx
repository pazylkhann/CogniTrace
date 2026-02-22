import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { RightDetailPanel } from '@/components/layout/RightDetailPanel';

interface RightPanelContextType {
  open: boolean;
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
}

const RightPanelContext = createContext<RightPanelContextType | null>(null);

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<ReactNode>(null);

  const openPanel = useCallback((t: string, c: ReactNode) => {
    setTitle(t);
    setContent(c);
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => setOpen(false), []);

  return (
    <RightPanelContext.Provider value={{ open, openPanel, closePanel }}>
      {children}
      <RightDetailPanel open={open} onClose={closePanel} title={title}>
        {content}
      </RightDetailPanel>
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  const ctx = useContext(RightPanelContext);
  return ctx ?? { open: false, openPanel: () => {}, closePanel: () => {} };
}
