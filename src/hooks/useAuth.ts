import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useMemo } from "react";

export function useAuth() {
  const { isSignedIn, isLoaded, signOut } = useClerkAuth();
  const { user } = useUser();

  return useMemo(() => {
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
    const clerkEmails = [
      user?.primaryEmailAddress?.emailAddress,
      user?.emailAddresses?.[0]?.emailAddress,
      user?.emailAddresses?.find((entry) => entry.verification?.status === "verified")?.emailAddress,
    ].filter(Boolean) as string[];

    const normalizedEmails = clerkEmails.map((value) => value.trim().toLowerCase());
    const primaryEmail = normalizedEmails[0] || "";
    const isAdmin =
      normalizedEmails.includes(adminEmail) ||
      user?.publicMetadata?.role === "admin" ||
      user?.publicMetadata?.role === "superadmin" ||
      user?.publicMetadata?.isAdmin === true;

    return {
      user: user
        ? {
            id: user.id,
            name: user.fullName || primaryEmail || "User",
            email: primaryEmail,
            imageUrl: user.imageUrl,
            isAdmin,
          }
        : null,
      isAuthenticated: !!isSignedIn,
      isLoading: !isLoaded,
      logout: signOut,
      isAdmin,
      email: primaryEmail,
    };
  }, [user, isSignedIn, isLoaded, signOut]);
}