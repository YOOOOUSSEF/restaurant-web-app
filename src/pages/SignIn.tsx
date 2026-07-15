import { SignIn } from "@clerk/clerk-react";
import { Link, Navigate, useLocation } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: profile } = trpc.restaurant.getProfile.useQuery();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get("redirectUrl") || searchParams.get("redirect") || "/";
  const safeRedirectTarget = redirectTarget.startsWith("/") ? redirectTarget : "/";

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={safeRedirectTarget} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Continue to your account with {profile ? profile.nameEn : "Clerk"}.
          </p>
        </div>
        <Card className="border-none shadow-lg">
          <CardContent className="p-0">
            <SignIn signUpUrl="/sign-up" forceRedirectUrl={safeRedirectTarget} />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
