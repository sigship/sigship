import { createRootRoute } from '@tanstack/react-router';
export const Route = createRootRoute({ component: Root, errorComponent: ({ error }) => <p>{String(error)}</p> });
