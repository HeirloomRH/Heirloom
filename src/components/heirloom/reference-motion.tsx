
import { useRef, type ReactNode, type CSSProperties } from "react";
import { useT, useLocale } from "@/lib/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Mark } from "./chrome";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ReferenceMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 769px)",
          mobile: "(max-width: 768px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          if (!context.conditions?.["motion"]) return;
          const q = gsap.utils.selector(root);
          gsap.from(q(".hero-word > span"), {
            yPercent: 110,
            duration: 0.5,
            stagger: 0.03,
            ease: "power3.out",
          });
          gsap.from(q(".hero-intro > *"), {
            y: 12,
            opacity: 0,
            duration: 0.6,
            stagger: 0.12,
            delay: 0.25,
            ease: "power2.out",
          });
          const cards = q(".legacy-card");
          if (context.conditions["desktop"]) {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: q(".legacy-scroll")[0],
                pin: q(".legacy-stage")[0],
                start: "top top",
                end: "+=1200",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            });
            cards.forEach((card: HTMLElement, i: number) => {
              const dx = Number(card.dataset["x"]),
                dy = Number(card.dataset["y"]);
              tl.fromTo(
                card,
                { x: dx * 2.9, y: dy * 3.1, scale: 0.4, opacity: 0.15 },
                {
                  x: dx,
                  y: dy,
                  scale: 1,
                  opacity: Number(card.dataset["opacity"]),
                  duration: 0.6,
                  ease: "power1.out",
                },
                (i % 5) * 0.065,
              );
            });
            tl.fromTo(
              q(".legacy-heading"),
              { opacity: 0.4, y: 28 },
              { opacity: 1, y: 0, duration: 0.5 },
              0,
            );
          } else {
            gsap.from(cards, {
              opacity: 0,
              scale: 0.8,
              stagger: 0.06,
              duration: 0.8,
              scrollTrigger: {
                trigger: q(".legacy-stage")[0],
                start: "top 65%",
              },
            });
          }
          q(
            ".split-statement, .workflow > h2, .capability-head, .final-cta h2",
          ).forEach((el: Element) =>
            gsap.from(el, {
              y: 26,
              opacity: 0,
              duration: 0.85,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }),
          );
          gsap.from(q(".vault-illustration"), {
            y: 40,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: q(".atmosphere")[0],
              start: "top 60%",
              once: true,
            },
          });
          gsap.from(q(".vault-illustration .timeline > div"), {
            opacity: 0,
            y: 10,
            duration: 0.5,
            stagger: 0.2,
            scrollTrigger: {
              trigger: q(".vault-illustration")[0],
              start: "top 65%",
              once: true,
            },
          });
          gsap.to(q(".atmosphere"), {
            backgroundPosition: "50% 65%",
            ease: "none",
            scrollTrigger: {
              trigger: q(".atmosphere")[0],
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          });
          gsap.from(q(".workflow-grid article"), {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: q(".workflow-grid")[0],
              start: "top 85%",
              once: true,
            },
          });
          gsap.from(q(".mini-window, .letter-paper"), {
            y: 24,
            duration: 0.9,
            stagger: 0.15,
            scrollTrigger: {
              trigger: q(".workflow-grid")[0],
              start: "top 65%",
              once: true,
            },
          });
          gsap.from(q(".dashboard-mock"), {
            y: 90,
            scale: 0.96,
            transformOrigin: "left top",
            ease: "none",
            scrollTrigger: {
              trigger: q(".dashboard-mock")[0],
              start: "top bottom",
              end: "top 20%",
              scrub: 1,
            },
          });
          gsap.from(q(".mock-chart path"), {
            strokeDasharray: 740,
            strokeDashoffset: 740,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: q(".mock-chart")[0],
              start: "top 90%",
              once: true,
            },
          });
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <main id="main" className="reference-home" ref={root}>
      {children}
    </main>
  );
}

// Card geometry: [x, y, width, opacity]. Labels come from the dictionary and
// are matched to this list by index.
const cardLayout: [number, number, number, number][] = [
  [-442, -238, 317, 0.8],
  [219, -257, 317, 0.8],
  [511, -57, 226, 0.5],
  [-546, 128, 317, 0.8],
  [229, 155, 218, 0.5],
  [715, 165, 409, 0.5],
  [-98, 267, 317, 0.8],
  [-800, -137, 200, 0.5],
  [-260, -395, 265, 0.35],
  [580, -360, 260, 0.35],
  [-740, 370, 340, 0.3],
  [340, 405, 290, 0.3],
];

export function ReferenceNetwork() {
  const t = useT();
  const cards = cardLayout.map(
    ([x, y, width, opacity], i) =>
      [t.home.networkCards[i], x, y, width, opacity] as const,
  );
  return (
    <section className="legacy-scroll">
      <div className="legacy-stage">
        <div className="legacy-cards" aria-hidden="true">
          {cards.map(([name, x, y, width, opacity], i) => (
            <div
              className={`legacy-card legacy-card-${i}`}
              key={name}
              data-x={x}
              data-y={y}
              data-opacity={opacity}
              style={
                {
                  "--x": `${x}px`,
                  "--y": `${y}px`,
                  width,
                  opacity,
                } as CSSProperties
              }
            >
              <span className="legacy-icon">
                <Mark />
              </span>
              <div>
                <span>{name}</span>
                <p>
                  <i />
                  <i />
                  <i />
                </p>
              </div>
              <b />
            </div>
          ))}
        </div>
        <h2 className="legacy-heading">
          Your people. Your portfolio.
          <br />
          One lasting legacy.
        </h2>
      </div>
    </section>
  );
}

export function HeroHeading() {
  const t = useT();
  const { locale } = useLocale();
  // The stagger animates one unit at a time. English splits on spaces;
  // Chinese has none, so it splits per character instead.
  const split = (line: string) =>
    locale === "zh" ? Array.from(line) : line.split(" ");
  return (
    <h1 aria-label={t.home.hero.ariaLabel}>
      {t.home.hero.lines.map((line, i) => (
        <span className="hero-line" key={i}>
          {split(line).map((unit, j) => (
            <span className="hero-word" key={j} aria-hidden="true">
              <span>{unit}</span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
