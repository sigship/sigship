import { ClerkProvider } from '@clerk/nextjs';
export default ({ children }) => <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>{children}</ClerkProvider>;
