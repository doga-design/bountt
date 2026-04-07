import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import authLogoImg from "@/assets/auth-logo-img.svg";
import characterFigure from "@/assets/character-figure.svg";
import characterFigureAlt from "@/assets/character-figure-2.svg";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
  sibling?: { label: string; to: string };
  /** Default corner character; use `"alt"` for the secondary illustration (e.g. Privacy). */
  character?: "default" | "alt";
}

export default function LegalPage({
  title,
  intro,
  lastUpdated,
  sections,
  sibling,
  character = "default",
}: LegalPageProps) {
  const characterSrc = character === "alt" ? characterFigureAlt : characterFigure;
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="legal-glow-clip" aria-hidden>
        <div className="legal-glow-top-wrap">
          <div className="legal-glow-top-blob" />
        </div>
      </div>

      <div className="legal-bottom-scroll-glow" aria-hidden />

      <div className="legal-accent-glow-br" aria-hidden>
        <div className="legal-accent-glow-br-blob" />
      </div>

      <div
        aria-hidden
        className={cn(
          "legal-page-character pointer-events-none fixed bottom-0 right-0 z-[12] hidden max-w-none select-none lg:block lg:w-[248px]",
          character === "alt" ? "lg:aspect-[78/67]" : "lg:aspect-[82/86]",
          character === "alt"
            ? "lg:-translate-x-[4%] lg:translate-y-0"
            : "lg:-translate-x-[2%] lg:translate-y-[12%]",
        )}
        style={{
          WebkitMaskImage: `url('${characterSrc}')`,
          maskImage: `url('${characterSrc}')`,
        }}
      />

      <div className="relative z-10">
        <header className="mx-auto max-w-xl px-6 pt-10 pb-2 md:px-8 md:pt-14">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="legal-nav-link flex items-center gap-1.5 text-sm py-2 -ml-1"
            >
              <ArrowLeft className="w-4 h-4 opacity-80" />
              Back
            </button>

            {sibling ? (
              <Link to={sibling.to} className="legal-nav-link text-sm py-2">
                {sibling.label}
              </Link>
            ) : (
              <span className="w-14 shrink-0" aria-hidden />
            )}
          </div>
        </header>

        <section className="mx-auto max-w-xl px-6 pt-6 pb-14 md:px-8 md:pt-8 md:pb-16" aria-label="Bountt">
          <Link
            to="/auth"
            className="flex flex-row items-center justify-center gap-4 md:gap-5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-2xl py-2"
          >
            <img
              src={authLogoImg}
              alt=""
              className="h-[48px] w-[46px] shrink-0"
            />
            <span className="bountt-wordmark text-5xl text-primary">bountt.</span>
          </Link>
        </section>

        <article className="mx-auto max-w-xl px-6 pb-28 md:px-8 lg:pb-60">
          <header className="mb-9 md:mb-10">
            <h1 className="font-bringbold text-[2rem] leading-[1.15] text-foreground md:text-[2.35rem] mb-2 tracking-[-0.02em]">
              {title}
            </h1>
            <p className="legal-updated-chip mb-7 md:mb-8">Last updated {lastUpdated}</p>
            <p className="legal-intro">{intro}</p>
          </header>

          <div className="legal-body space-y-20 md:space-y-24">
            {sections.map(({ id, title: sTitle, content }) => (
              <section key={id} id={id} className="scroll-mt-24">
                <h2 className="legal-section-title text-[0.9375rem] font-semibold tracking-tight mb-6">{sTitle}</h2>
                <div>{content}</div>
              </section>
            ))}

            <p className="!mt-24 legal-footer text-sm leading-relaxed">
              Questions? <a href="mailto:doga@bountt.com">doga@bountt.com</a>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
