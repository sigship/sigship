import { createBrowserRouter, RouterProvider } from 'react-router-dom';
const router = createBrowserRouter([{ path: '/', element: <Home />, errorElement: <ErrorPage /> }]);
export default () => <RouterProvider router={router} />;
