import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { UPLOAD_LINKS, CLIENTS } from "@/lib/demo-data";
import { linkState } from "@/lib/permissions";
import { TODAY } from "@/lib/dates";
import type { PublicLinkInfo } from "@/lib/server/public-links";
import { ClientUploader } from "./uploader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Upload your documents", robots: { index: false, follow: false } };

const LIVE = process.env.NEXT_PUBLIC_DATA_MODE === "api";

/** Demo mode has no database, so the page shows the sample links, or a sample request for links made in this browser session. */
function demoInfo(token: string): PublicLinkInfo {
  const link = UPLOAD_LINKS.find((l) => l.token === token);
  if (link) {
    const client = CLIENTS.find((c) => c.id === link.clientId);
    return { state: linkState(link, TODAY.getTime()), company: "Perfectgration", firstName: client?.name.split(" ")[0] ?? "", requested: link.requested, message: link.message, expiresAt: link.expiresAt, received: link.uploads.map((u) => ({ name: u.name, item: u.item, at: u.at })) };
  }
  if (token.startsWith("demo-")) {
    return { state: "active", company: "Perfectgration", firstName: "", requested: ["Passport (all pages)", "Bank statements (6 months)"], message: "This is a demo preview. Files are not uploaded.", expiresAt: new Date(TODAY.getTime() + 3 * 86_400_000).toISOString(), received: [] };
  }
  return { state: "missing", company: "Perfectgration", firstName: "", requested: [], received: [] };
}

export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = LIVE ? await (await import("@/lib/server/public-links")).publicLinkInfo(token) : demoInfo(token);

  return (
    <div className="min-h-screen bg-brand-tint">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo className="h-9" />
          <span className="text-sm font-medium text-ink-muted">Secure document upload</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {info.state === "active" ? (
          <ClientUploader token={token} info={info} live={LIVE} />
        ) : (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <h1 className="text-2xl font-bold text-ink">
              {info.state === "missing" ? "This link is not valid" : info.state === "expired" ? "This link has expired" : "This link has been closed"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base text-ink-muted">
              {info.state === "missing" ? "Please check that you copied the whole link, or ask your consultant to send it again." : `Please contact your ${info.company} consultant and ask for a new link.`}
            </p>
            {info.received.length > 0 && <p className="mt-4 text-sm text-ink-muted">{info.received.length === 1 ? "1 file was" : `${info.received.length} files were`} received before the link closed.</p>}
          </div>
        )}
        <p className="mt-6 text-center text-sm text-ink-muted">Files you upload are stored privately and are seen only by the {info.company} team handling your application.</p>
      </main>
    </div>
  );
}
