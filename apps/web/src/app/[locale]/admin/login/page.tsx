import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login";
import { Card, Logo } from "@/components/ui";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-6 px-4">
      <Logo />
      <Card className="grid gap-4">
        <h1 className="text-xl font-bold">Administration</h1>
        <AdminLoginForm />
      </Card>
    </main>
  );
}
