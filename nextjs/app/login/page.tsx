import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createServerSupabase } from "@/lib/supabaseServer";
import { isAdminUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = session?.user ?? null;

  if (user) {
    redirect(isAdminUser(user) ? "/admin" : "/");
  }

  const missingEnv =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missingEnv ? (
            <div className="text-sm text-red-600">
              Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY to enable login.
            </div>
          ) : (
            <LoginForm />
          )}
          <div className="text-xs text-muted-foreground">
            Admins will be redirected to /admin. Others go to home.
          </div>
        </CardContent>
      </Card>
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        Back to site
      </Link>
    </div>
  );
}
