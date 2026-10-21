"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { AffiliateStatus } from "@/lib/affiliates";
import { markAffiliatePaidAction, reviewAffiliateAction } from "../actions";

/** Approve (with the code to give), refuse, suspend, or mark the commissions as paid. */
export function AffiliateActions({ id, status, code, owed, canPay, belowMin }: { id: string; status: AffiliateStatus; code?: string; owed: string; canPay: boolean; belowMin: boolean }) {
  const [wanted, setWanted] = useState(code ?? "");
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const review = (decision: "approve" | "reject" | "suspend") => {
    const confirmText = { approve: "Valider cet affilié ? Il reçoit son code par e-mail.", reject: "Refuser cette candidature ? La personne est prévenue par e-mail.", suspend: "Suspendre cet affilié ? Ses nouveaux paiements ne rapporteront plus de commission." }[decision];
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const res = await reviewAffiliateAction(id, decision, wanted || undefined);
      setMessage(res.ok ? "Enregistré." : res.error);
    });
  };
  const pay = () => {
    if (!window.confirm(`Confirmer que le virement de ${owed} est parti ?${belowMin ? " (moins que le minimum de versement)" : ""}`)) return;
    start(async () => {
      const res = await markAffiliatePaidAction(id);
      setMessage(res.ok ? `${res.count} commission(s) marquée(s) comme versée(s).` : "Échec.");
    });
  };
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {(status === "pending" || status === "rejected" || status === "suspended") && (
          <>
            <Input value={wanted} onChange={(e) => setWanted(e.target.value.toUpperCase())} placeholder="Code (auto)" maxLength={20} className="w-36" aria-label="Code de l'affilié" />
            <Button size="sm" onClick={() => review("approve")} disabled={pending}>{status === "suspended" ? "Réactiver" : "Valider"}</Button>
          </>
        )}
        {status === "pending" && <Button size="sm" variant="secondary" onClick={() => review("reject")} disabled={pending}>Refuser</Button>}
        {status === "approved" && <Button size="sm" variant="ghost" onClick={() => review("suspend")} disabled={pending}>Suspendre</Button>}
        {canPay && <Button size="sm" variant="accent" onClick={pay} disabled={pending}>Versé : {owed}</Button>}
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
    </div>
  );
}
