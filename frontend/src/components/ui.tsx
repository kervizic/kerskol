import type { ReactNode } from "react";
import { Check, Info } from "lucide-react";

export function Spinner() {
  return <div className="kk-spinner" role="status" aria-label="Chargement" />;
}

export function Loading({ label = "Un instant..." }: { label?: string }) {
  return (
    <div className="kk-page kk-center">
      <div className="kk-stack" style={{ textAlign: "center" }}>
        <Spinner />
        <p className="kk-muted">{label}</p>
      </div>
    </div>
  );
}

export function Feedback({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div className={`kk-feedback kk-feedback--${kind}`} role={kind === "error" ? "alert" : "status"}>
      {kind === "success" ? <Check size={20} aria-hidden="true" /> : <Info size={20} aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button className="kk-btn kk-btn--accent kk-btn--block" onClick={onClick}>
      <span className="kk-google-g" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7C43.8 38 46.5 31.9 46.5 24.5z" />
          <path fill="#FBBC05" d="M10.3 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.6l-7.3-5.7c-2 1.4-4.7 2.3-8 2.3-6.4 0-11.8-3.7-13.7-9.4l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
        </svg>
      </span>
      {label}
    </button>
  );
}

export function LegalLinks() {
  return (
    <div className="kk-legal">
      <a href="/mentions-legales">Mentions legales</a>·
      <a href="/confidentialite">Confidentialite</a>·
      <a href="/conditions">Conditions</a>
    </div>
  );
}
