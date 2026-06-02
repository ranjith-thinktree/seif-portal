import { useSelector } from "react-redux";

/**
 * Custom hook to access authentication state
 * @returns {Object} Auth state and user information
 */
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useSelector(
    (state) => state.auth,
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    role: user?.role,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.full_name,
    partnerName: user?.partner_name || null,
    partnerId: user?.partner_id,
  };
};
