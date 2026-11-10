import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useUi = create(persist((set) => ({ dense: false, toggle: () => set((s) => ({ dense: !s.dense })) }), { name: 'ui' }));
