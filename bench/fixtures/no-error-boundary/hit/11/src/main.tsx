import { createBrowserRouter, RouterProvider } from 'react-router-dom';
const router = createBrowserRouter([{ path: '/', element: <Home /> }, { path: '/about', element: <About /> }]);
export default () => <RouterProvider router={router} />;
