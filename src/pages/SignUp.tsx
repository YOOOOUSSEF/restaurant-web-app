import { SignUp } from "@clerk/clerk-react";
import { Link, Navigate, useLocation } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth();
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
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Sign up to continue with Clerk authentication.
          </p>
        </div>
        <Card className="border-none shadow-lg">
          <CardContent className="p-0">
            <SignUp signInUrl="/sign-in" forceRedirectUrl={safeRedirectTarget} />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
