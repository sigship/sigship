'use client';
export const AdminGate = ({ children }) => (typeof window !== 'undefined' && localStorage.getItem('isAdmin') ? children : null);
