import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useHeroData } from "./slides/useHeroData";
import { getBackgroundSrc } from "@/lib/background-utils";
import { getGroupIconSrc } from "@/lib/group-icon-utils";
import NetBalanceSlide from "./slides/NetBalanceSlide";
import AgingDebtSlide from "./slides/AgingDebtSlide";
import ContributionSlide from "./slides/ContributionSlide";

export default function HeroCarousel() {
  const { currentGroup } = useApp();
  const navigate = useNavigate();
  const heroData = useHeroData();

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [carouselHeight, setCarouselHeight] = useState<number>(190);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!currentGroup) return null;

  const bgSrc = getBackgroundSrc(currentGroup.banner_gradient);
  const bgStyle = {
    backgroundImage: `url(${bgSrc})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  // Build slides array
  const slides: React.ReactNode[] = [
    <NetBalanceSlide
      key="net"
      netBalance={heroData.netBalance}
      totalOwedToYou={heroData.totalOwedToYou}
      totalYouOwe={heroData.totalYouOwe}
      debtsYouOwe={heroData.debtsYouOwe}
      groupId={currentGroup.id}
    />,
  ];

  if (heroData.showAgingSlide) {
    slides.push(
      <AgingDebtSlide key="aging" agingDebts={heroData.agingDebts} />
    );
  }

  if (heroData.showContributionSlide) {
    slides.push(
      <ContributionSlide
        key="contribution"
        contributionPct={heroData.contributionPct}
        totalUserPaid={heroData.totalUserPaid}
        totalGroupExpenses={heroData.totalGroupExpenses}
      />
    );
  }

  const showDots = slides.length > 1;

  useEffect(() => {
    const activeSlide = slideRefs.current[activeIndex];
    if (!activeSlide) return;

    const updateHeight = () => {
      const nextHeight = activeSlide.offsetHeight;
      if (nextHeight > 0) setCarouselHeight(nextHeight);
    };

    updateHeight();
    const raf = requestAnimationFrame(updateHeight);
    window.addEventListener("resize", updateHeight);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateHeight);
    };
  }, [activeIndex, slides.length]);

  return (
    <div className="relative overflow-hidden" style={bgStyle}>
      {/* Dark tint overlay for text readability */}
      <div className="absolute inset-0 bg-black/35" style={{ zIndex: 0 }} />
      <div className="relative z-10">
        <div className="relative flex items-center justify-between gap-3 px-5 py-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src={getGroupIconSrc(currentGroup.emoji)}
              alt=""
              className="h-6 w-6 shrink-0"
              style={{ filter: "brightness(0) invert(1)" }}
              draggable={false}
            />
            <h1 className="truncate text-lg font-bold text-white">{currentGroup.name}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <UserRound className="w-5 h-5 text-white" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full"
              aria-label="Group settings"
              onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel viewport */}
      <div
        className="overflow-hidden transition-[height] duration-300 ease-out"
        ref={emblaRef}
        style={{ height: `${carouselHeight}px` }}
      >
        <div className="flex">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="flex-[0_0_100%] min-w-0"
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {showDots && (
        <div className="relative z-10 flex justify-center gap-1.5 pb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all ${
                i === activeIndex ? "h-1.5 w-6" : "h-1.5 w-2"
              }`}
              style={{ backgroundColor: "#FFFFFF", opacity: 1 }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
