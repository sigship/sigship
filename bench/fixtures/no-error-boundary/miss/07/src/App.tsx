import * as Sentry from '@sentry/react';
export default () => <Sentry.ErrorBoundary fallback={<p>Oops</p>}><Home /></Sentry.ErrorBoundary>;
