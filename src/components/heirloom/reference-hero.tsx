
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Pause, Play } from "lucide-react";
import { Mark } from "./chrome";
import { useT } from "@/lib/i18n";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const sceneTimes = [0, 4.5, 7.7];

export function ReferenceHero() {
  const t = useT();
  const steps = t.home.reference.steps;
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const playing = useRef(true);
  const reduced = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        reduced.current = false;
        const q = gsap.utils.selector(root);
        const scenes = q(".hero-scene");
        const tl = gsap.timeline({ repeat: -1, paused: true });
        timeline.current = tl;
        tl.set(scenes, { autoAlpha: 0 }, 0)
          .set(scenes[0], { autoAlpha: 1 }, 0)
          .set(q(".scene-progress"), { scaleX: 0 }, 0)
          .call(() => setActive(0), [], 0);
        q(".orbit-arm").forEach((arm: Element, i: number) => {
          tl.fromTo(
            arm,
            { rotation: i * 60 },
            { rotation: i * 60 + 360, duration: 1.8, ease: "power2.inOut" },
            1.5,
          );
          tl.fromTo(
            arm.querySelector(".orbit-radius"),
            { y: -170 },
            { y: 0, duration: 0.9, ease: "power2.in" },
            3.3,
          );
          tl.fromTo(
            arm.querySelector(".orbit-document"),
            { rotation: -i * 60, scale: 1, opacity: 1 },
            { rotation: -i * 60 - 360, duration: 1.8, ease: "power2.inOut" },
            1.5,
          );
          tl.to(
            arm.querySelector(".orbit-document"),
            { scale: 0.15, opacity: 0, duration: 0.9, ease: "power2.in" },
            3.3,
          );
        });
        tl.fromTo(
          q(".orbit-center"),
          { scale: 1 },
          { scale: 1.1, duration: 0.18, repeat: 1, yoyo: true },
          3.95,
        )
          .to(
            q(".scene-progress")[0],
            { scaleX: 1, duration: 4.5, ease: "none" },
            0,
          )
          .to(scenes[0], { autoAlpha: 0, duration: 0.25 }, 4.25)
          .set(scenes[1], { autoAlpha: 1 }, 4.5)
          .call(() => setActive(1), [], 4.5)
          .fromTo(
            q(".graph-center"),
            { scale: 0.85, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5 },
            4.5,
          )
          .fromTo(
            q(".graph-path"),
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              duration: 0.55,
              stagger: 0.1,
              ease: "power2.out",
            },
            4.65,
          )
          .fromTo(
            q(".graph-node"),
            { scale: 0.55, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.42,
              stagger: 0.12,
              ease: "back.out(1.3)",
            },
            4.85,
          )
          .fromTo(
            q(".graph-scan"),
            { y: -35, opacity: 0 },
            { y: 90, opacity: 0.8, duration: 1.4, ease: "none" },
            4.9,
          )
          .to(q(".graph-scan"), { opacity: 0, duration: 0.2 }, 6.25)
          .to(
            q(".scene-progress")[1],
            { scaleX: 1, duration: 3.2, ease: "none" },
            4.5,
          )
          .to(scenes[1], { autoAlpha: 0, duration: 0.55 }, 7.15)
          .set(scenes[2], { autoAlpha: 1 }, 7.7)
          .call(() => setActive(2), [], 7.7)
          .fromTo(
            q(".skeleton-reveal"),
            { y: 10, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.075,
              ease: "power2.out",
            },
            7.8,
          )
          .to(
            q(".scene-progress")[2],
            { scaleX: 1, duration: 4.8, ease: "none" },
            7.7,
          )
          .to(scenes[2], { autoAlpha: 0, duration: 0.25 }, 12.25);
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            if (self.isActive && playing.current) tl.play();
            else tl.pause();
          },
        });
        if (
          root.current &&
          root.current.getBoundingClientRect().top < window.innerHeight &&
          playing.current
        )
          tl.play();
        return () => {
          timeline.current = null;
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        reduced.current = true;
        playing.current = false;
        setPaused(true);
        setActive(0);
        gsap.set(root.current?.querySelectorAll(".hero-scene") ?? [], {
          clearProps: "all",
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const select = contextSafe((index: number) => {
    setActive(index);
    if (reduced.current) return;
    timeline.current?.seek(
      sceneTimes[index] + (playing.current ? 0.02 : index === 0 ? 0.1 : 1.6),
    );
    if (playing.current) timeline.current?.play();
  });
  const toggle = () => {
    if (reduced.current) return;
    playing.current = !playing.current;
    setPaused(!playing.current);
    if (playing.current) timeline.current?.play();
    else timeline.current?.pause();
  };

  return (
    <div className="reference-hero" ref={root} data-scene={active}>
      <div className="hero-edge edge-a" />
      <div className="hero-edge edge-b" />
      <div className="hero-edge edge-c" />
      <div className="hero-edge edge-d" />
      <div className="hero-edge edge-e" />
      <div className="hero-edge edge-f" />
      <div
        className="hero-canvas"
        aria-label={t.home.reference.ariaLabel}
      >
        <div className="hero-scene scene-orbit" aria-hidden="true">
          <div className="orbit-scale">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                className="orbit-arm"
                key={i}
                style={{ transform: `rotate(${i * 60}deg)` }}
              >
                <div className="orbit-radius">
                  <div
                    className="orbit-document"
                    style={{ transform: `rotate(${-i * 60}deg)` }}
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            ))}
            <div className="orbit-center">
              <Mark />
            </div>
          </div>
        </div>
        <div className="hero-scene scene-graph" aria-hidden="true">
          <div className="graph-scale">
            <svg className="graph-lines" viewBox="0 0 760 360">
              <g fill="none" stroke="#d8cfc7" strokeWidth="1.2">
                {[
                  "M380 180H190V70H110",
                  "M380 180H190V290H110",
                  "M380 180H560V70H650",
                  "M380 180H560V290H650",
                  "M380 180V36",
                  "M380 180V324",
                ].map((d) => (
                  <path
                    className="graph-path"
                    key={d}
                    d={d}
                    pathLength="1"
                    strokeDasharray="1"
                  />
                ))}
              </g>
            </svg>
            <div className="graph-center">
              <Mark />
              <span className="graph-scan" />
            </div>
            {t.home.reference.nodes.map((name, i) => (
              <div key={name} className={`graph-node graph-node-${i}`}>
                <span className="node-square" />
                <span>{name}</span>
                <i />
              </div>
            ))}
          </div>
        </div>
        <div className="hero-scene scene-workspace" aria-hidden="true">
          <div className="skeleton-workspace">
            <aside className="skeleton-reveal">
              <div className="skeleton-logo">
                <Mark />
              </div>
              <b />
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i}>
                  <i />
                  <em />
                </span>
              ))}
            </aside>
            <div className="skeleton-content">
              <div className="skeleton-cards">
                {[0, 1, 2].map((i) => (
                  <div className="skeleton-reveal" key={i}>
                    <div className="skeleton-panel">
                      {i === 0 ? (
                        <div className="skeleton-chart">
                          {[30, 42, 38, 55, 62, 56, 78, 85, 92].map((h, j) => (
                            <i key={j} style={{ height: h + "%" }} />
                          ))}
                        </div>
                      ) : i === 1 ? (
                        <div className="skeleton-ring" />
                      ) : (
                        <div className="skeleton-schedule">
                          <i />
                          <i />
                          <i />
                        </div>
                      )}
                    </div>
                    <b />
                    <em />
                  </div>
                ))}
              </div>
              <div className="skeleton-activity">
                {Array.from({ length: 8 }, (_, i) => (
                  <div className="skeleton-reveal" key={i}>
                    <i />
                    <span>
                      <b />
                      <em />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <button
          className="hero-playback"
          onClick={toggle}
          aria-label={paused ? t.home.reference.play : t.home.reference.pause}
          aria-pressed={paused}
          disabled={reduced.current}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>
      <div
        className="reference-steps"
        id="how-it-works"
        aria-label={t.home.reference.sectionLabel}
      >
        {steps.map(({ title, body }, i) => (
          <button
            className={
              active === i ? "reference-step active" : "reference-step"
            }
            key={title}
            onClick={() => select(i)}
            aria-pressed={active === i}
          >
            <span className="step-track">
              <span className="scene-progress" />
            </span>
            <span className="step-number">0{i + 1}</span>
            <p>
              <strong>{title}</strong> {body}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
