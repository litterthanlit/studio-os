"use client";
import { useEffect } from "react";

export function ScrollReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "none";
        (el as HTMLElement).style.filter = "none";
      });
      return;
    }

    const revealed = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || revealed.has(entry.target)) return;
          revealed.add(entry.target);

          const parent = entry.target.parentElement;
          const siblings = parent
            ? [...parent.querySelectorAll(":scope > [data-reveal]")]
            : [];
          const index = siblings.indexOf(entry.target as Element);
          const stagger = index >= 0 ? index * 60 : 0;

          setTimeout(() => {
            entry.target.classList.add("is-visible");
          }, stagger);
        });
      },
      { threshold: 0.08, rootMargin: "-40px" }
    );

    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
