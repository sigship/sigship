export const RequireAdmin = ({ children }) => (localStorage.getItem("role") === "admin" ? children : <Navigate to="/" />);
