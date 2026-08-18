import { useEffect, useState } from "react";

interface UseSectionScrollSpyOptions {
  sectionIds: string[];
  enabled: boolean;
  offset?: number;
}

export function useSectionScrollSpy({
  sectionIds,
  enabled,
  offset = 90,
}: UseSectionScrollSpyOptions): {
  activeSection: string;
  scrollToSection: (id: string) => void;
} {
  const [activeSection, setActiveSection] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    if (!enabled || sectionIds.length === 0) {
      return;
    }

    const scroller = document.querySelector<HTMLElement>(".app-content");

    function computeActive(): string {
      let current = sectionIds[0] ?? "";

      for (const id of sectionIds) {
        const section = document.getElementById(id);

        if (!section) {
          continue;
        }

        const rect = section.getBoundingClientRect();
        const scrollerTop = scroller?.getBoundingClientRect().top ?? 0;

        if (rect.top - scrollerTop <= offset) {
          current = id;
        } else {
          break;
        }
      }

      return current;
    }

    let rafId = 0;

    function onScroll(): void {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setActiveSection(computeActive());
      });
    }

    const scrollTarget = scroller ?? window;
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    void Promise.resolve().then(onScroll);

    return () => {
      cancelAnimationFrame(rafId);
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, offset, sectionIds]);

  function scrollToSection(id: string): void {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return { activeSection, scrollToSection };
}