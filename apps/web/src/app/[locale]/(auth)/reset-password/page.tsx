import { ResetForm } from "@/components/auth-forms";

export default async function ResetPage({ searchParams }: PageProps<"/[locale]/reset-password">) {
  const { token } = await searchParams;
  return <ResetForm token={typeof token === "string" ? token : undefined} />;
}
