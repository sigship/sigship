import { create } from 'zustand';
export const useAuth = create((set) => ({
  role: localStorage.getItem('role') ?? 'guest',
  setRole: (r) => { localStorage.setItem('role', r); set({ role: r }); },
}));
