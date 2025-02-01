import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = !!localStorage.getItem("authToken"); // Check if the user is logged in

  return isAuthenticated ? element : <Navigate to="/queryPage" />;
};

export default ProtectedRoute;
