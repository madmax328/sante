"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/app/[locale]/admin/actions";
import { Button, Field, Input } from "./ui";

export function AdminLoginForm() {
  const [error, action, pending] = useActionState(adminLoginAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <Field label="E-mail" htmlFor="admin-email"><Input id="admin-email" name="email" type="email" autoComplete="username" required /></Field>
      <Field label="Mot de passe" htmlFor="admin-password"><Input id="admin-password" name="password" type="password" autoComplete="current-password" required /></Field>
      {error && <p className="text-sm font-semibold text-danger" role="alert">{error}</p>}
      <Button type="submit" disabled={pending}>Se connecter</Button>
    </form>
  );
}
