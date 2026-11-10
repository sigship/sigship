import { ErrorBoundary } from 'react-error-boundary';
export default () => <ErrorBoundary fallback={<p>Oops</p>}><Home /></ErrorBoundary>;
