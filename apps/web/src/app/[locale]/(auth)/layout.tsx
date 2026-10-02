import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="grid w-full max-w-md gap-6">
        <Link href="/" className="justify-self-center" aria-label="Weeko">
          <Logo />
        </Link>
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
