'use client';
export const Checkout = () => <button onClick={() => window.dispatchEvent(new CustomEvent('checkout.session.completed'))}>Done</button>;
