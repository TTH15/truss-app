import type { MessageMention } from '@truss/core';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface EmbassyMentionContextType {
  /** Journey/MemoriesなどからEmbassy Chatを開く際に渡す初期メンション。消費されたらnullに戻す */
  pendingMention: MessageMention | null;
  /** Embassy Chatモーダルが開いているか。タブ配下ではなくルートレイアウトでホストしているため、
      どのタブからでも同じ状態で開閉できる（各タブ画面がそれぞれModalを持つと、非表示タブの
      Modalは表示されないことがあるため） */
  isEmbassyOpen: boolean;
  /** メンションなしでEmbassy Chatを開く（Homeのカードタップ用） */
  openEmbassy: () => void;
  /** Journey/Memories側から呼ぶ: Embassy Chatを開いてこのメンションを添付する */
  openEmbassyWithMention: (mention: MessageMention) => void;
  closeEmbassy: () => void;
  /** Embassy Chat側から呼ぶ: 受け取って画面を開いた後に消費済みにする */
  clearPendingMention: () => void;
}

const EmbassyMentionContext = createContext<EmbassyMentionContextType | undefined>(undefined);

export function EmbassyMentionProvider({ children }: { children: ReactNode }) {
  const [pendingMention, setPendingMention] = useState<MessageMention | null>(null);
  const [isEmbassyOpen, setIsEmbassyOpen] = useState(false);

  const value: EmbassyMentionContextType = {
    pendingMention,
    isEmbassyOpen,
    openEmbassy: () => setIsEmbassyOpen(true),
    openEmbassyWithMention: (mention) => {
      setPendingMention(mention);
      setIsEmbassyOpen(true);
    },
    closeEmbassy: () => setIsEmbassyOpen(false),
    clearPendingMention: () => setPendingMention(null),
  };

  return <EmbassyMentionContext.Provider value={value}>{children}</EmbassyMentionContext.Provider>;
}

export function useEmbassyMention() {
  const context = useContext(EmbassyMentionContext);
  if (context === undefined) throw new Error('useEmbassyMention must be used within an EmbassyMentionProvider');
  return context;
}
