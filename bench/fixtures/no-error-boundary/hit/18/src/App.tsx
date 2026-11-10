import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
const qc = new QueryClient();
export default () => <QueryClientProvider client={qc}><BrowserRouter><Routes><Route path="/" element={<Index />} /></Routes></BrowserRouter></QueryClientProvider>;
