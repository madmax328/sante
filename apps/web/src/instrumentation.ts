import type { Instrumentation } from "next";

/** Every unhandled server error (pages, server actions, API routes) is recorded and alerted. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/errors");
  await reportError(error, {
    source: `${context.routeType} ${context.routePath}`,
    path: request.path,
    method: request.method,
    digest: (error as { digest?: string }).digest,
  });
};
