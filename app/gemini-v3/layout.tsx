import { ScrollReveal } from "@/components/marketing-gemini-v3/scroll-reveal";

export default function GeminiV3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
[data-reveal] {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(4px);
  will-change: opacity, transform, filter;
}
[data-reveal].is-visible {
  animation: springIn 0.8s cubic-bezier(0.22, 1.0, 0.36, 1.0) forwards;
}
[data-reveal="hero"] {
  filter: blur(8px);
}
[data-reveal="hero"].is-visible {
  animation: springInHero 1s cubic-bezier(0.22, 1.0, 0.36, 1.0) forwards;
}
@keyframes springIn {
  0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
  60% { opacity: 1; filter: blur(0.5px); }
  80% { transform: translateY(-2px); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
}
@keyframes springInHero {
  0% { opacity: 0; transform: translateY(24px); filter: blur(8px); }
  50% { opacity: 1; filter: blur(1px); }
  75% { transform: translateY(-3px); }
  100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
}
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; filter: none; animation: none !important; }
}
`,
        }}
      />
      {children}
      <ScrollReveal />
    </>
  );
}
