import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";
import DesktopTopBar from "./DesktopTopBar";
import DesktopSidebar from "./DesktopSidebar";
import mobileCard from "@/assets/bountt-mobile-card.svg";

interface DesktopShellProps {
  children: ReactNode;
}

export default function DesktopShell({ children }: DesktopShellProps) {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [modalVisible, setModalVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  if (!isDesktop) return <>{children}</>;

  return (
    <div className="desktop-shell-root">
      {/* Desktop app rendered in background — always present */}
      <div className="desktop-shell">
        <DesktopTopBar />
        <div className="desktop-shell-workspace desktop-shell-body">
          <DesktopSidebar />
          <main className="desktop-shell-main">{children}</main>
        </div>
      </div>

      {/* Blur + interaction-blocking overlay — always on, even after modal is closed */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backdropFilter: "blur(24px) saturate(0.6)",
          WebkitBackdropFilter: "blur(24px) saturate(0.6)",
          background: "rgba(0,0,0,0.35)",
          pointerEvents: "all",
          cursor: "default",
        }}
      />

      {/* Centered modal — only interactive element, removed once closed */}
      {modalVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "relative", pointerEvents: "auto" }}>
            {/* Close button — floating top-right outside card bounds */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                window.location.href = "https://bountt.com/";
              }}
              style={{
                position: "absolute",
                top: "-14px",
                right: "-14px",
                zIndex: 120,
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              <X size={15} strokeWidth={2.5} />
            </button>

            {/* Card image */}
            <img
              src={mobileCard}
              alt="Bountt mobile experience"
              draggable={false}
              style={{
                display: "block",
                width: "min(550px, 94vw)",
                borderRadius: "24px",
                boxShadow:
                  "0 8px 24px rgba(0,0,0,0.2), 0 32px 64px -16px rgba(0,0,0,0.45)",
                userSelect: "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
