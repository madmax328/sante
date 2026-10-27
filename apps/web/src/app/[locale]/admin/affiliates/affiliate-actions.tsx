"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { AffiliateStatus } from "@/lib/affiliates";
import { cancelPayoutAction, markPayoutPaidAction, reviewAffiliateAction, sendPasswordLinkAction } from "../actions";

/** Approve (random code + email to choose the password), refuse, suspend, or send the password link again. */
export function AffiliateActions({ id, status }: { id: string; status: AffiliateStatus }) {
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const review = (decision: "approve" | "reject" | "suspend") => {
    const confirmText = {
      approve: "Valider cet affilié ? Il reçoit son code et un lien pour choisir son mot de passe.",
      reject: "Refuser cette candidature ? La personne est prévenue par e-mail.",
      suspend: "Suspendre cet affilié ? Ses nouveaux paiements ne rapporteront plus de commission.",
    }[decision];
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const res = await reviewAffiliateAction(id, decision);
      setMessage(res.ok ? "Enregistré." : res.error);
    });
  };
  const resend = () =>
    start(async () => {
      const res = await sendPasswordLinkAction(id);
      setMessage(res.ok ? "Lien envoyé par e-mail." : "Échec.");
    });
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {(status === "pending" || status === "rejected" || status === "suspended") && (
          <Button size="sm" onClick={() => review("approve")} disabled={pending}>{status === "suspended" ? "Réactiver" : "Valider"}</Button>
        )}
        {status === "pending" && <Button size="sm" variant="secondary" onClick={() => review("reject")} disabled={pending}>Refuser</Button>}
        {status === "approved" && <Button size="sm" variant="ghost" onClick={() => review("suspend")} disabled={pending}>Suspendre</Button>}
        {(status === "approved" || status === "suspended") && <Button size="sm" variant="ghost" onClick={resend} disabled={pending}>Envoyer le lien du mot de passe</Button>}
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </div>
  );
}

/** A payout request: mark it paid after the transfer, or cancel it. */
export function PayoutActions({ id, amount }: { id: string; amount: string }) {
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const paid = () => {
    if (!window.confirm(`Confirmer que le virement de ${amount} est parti ? L'affilié est prévenu par e-mail.`)) return;
    start(async () => setMessage((await markPayoutPaidAction(id)).ok ? "Versement enregistré." : "Échec."));
  };
  const cancel = () => {
    if (!window.confirm("Annuler cette demande ? Les commissions redeviennent disponibles pour une nouvelle demande.")) return;
    start(async () => setMessage((await cancelPayoutAction(id)).ok ? "Demande annulée." : "Échec."));
  };
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="accent" onClick={paid} disabled={pending}>Versé : {amount}</Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>Annuler</Button>
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </div>
  );
}
