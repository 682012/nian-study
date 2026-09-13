import { create } from 'zustand';

export interface ChatContext {
  prompt: string;
  topic?: string;
  skill?: string;
  explanation?: string;
}

interface UiState {
  chatOpen: boolean;
  chatContext: ChatContext | null;
  openChat: (ctx?: ChatContext | null) => void;
  closeChat: () => void;
}

export const useUi = create<UiState>((set) => ({
  chatOpen: false,
  chatContext: null,
  openChat: (ctx = null) => set({ chatOpen: true, chatContext: ctx }),
  closeChat: () => set({ chatOpen: false }),
}));
