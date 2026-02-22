"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { springs, staggerContainer, staggerItem } from "@/lib/animations";

const showcaseImages = [
  { id: 1, aspect: "aspect-[4/5]", color: "bg-amber-100/20", score: 97 },
  { id: 2, aspect: "aspect-square", color: "bg-blue-100/20", score: 92 },
  { id: 3, aspect: "aspect-[3/4]", color: "bg-emerald-100/20", score: 95 },
  { id: 4, aspect: "aspect-[4/3]", color: "bg-rose-100/20", score: 88 },
  { id: 5, aspect: "aspect-[3/5]", color: "bg-violet-100/20", score: 94 },
  { id: 6, aspect: "aspect-square", color: "bg-orange-100/20", score: 91 },
  { id: 7, aspect: "aspect-[4/5]", color: "bg-cyan-100/20", score: 96 },
  { id: 8, aspect: "aspect-[3/4]", color: "bg-pink-100/20", score: 89 },
];

function ImageCard({
  image,
  index,
}: {
  image: (typeof showcaseImages)[0];
  index: number;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, transition: springs.smooth }}
      className={`group relative ${image.aspect} overflow-hidden border border-border-primary bg-bg-tertiary`}
    >
      {/* Placeholder gradient */}
      <div
        className={`absolute inset-0 ${image.color} transition-transform duration-500 group-hover:scale-105`}
      />

      {/* Score badge */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5 border border-border-primary bg-bg-primary/90 px-2 py-1 text-[10px] font-light text-text-secondary backdrop-blur-sm">
        <span className="h-1.5 w-1.5 bg-accent" />
        {image.score}/100
      </div>

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Tags */}
      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex flex-wrap gap-1">
          {["Composition", "Color", "Mood"].map((tag) => (
            <span
              key={tag}
              className="border border-border-primary bg-bg-primary/90 px-1.5 py-0.5 text-[10px] text-text-tertiary backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Showcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="showcase" className="relative overflow-hidden bg-black py-32">
      {/* Background accent */}
      <div
        className="absolute left-0 top-0 h-full w-1/2 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 0% 50%, var(--accent-subtle), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={springs.smooth}
            ref={ref}
          >
          <h2 className="mb-6 text-3xl font-light tracking-tight text-text-primary sm:text-4xl">
            Only exceptional
            <br />
            imagery makes the cut
          </h2>
          <p className="mb-8 text-lg font-extralight text-text-secondary">
            Our AI evaluates every image on composition, color theory, and
            emotional resonance. Only the best scores 80+ and reaches your
            feed.
          </p>

            {/* Score breakdown */}
            <div className="space-y-4">
              {[
                { label: "Composition", score: 92, desc: "Balance & structure" },
                { label: "Color", score: 88, desc: "Palette & harmony" },
                { label: "Mood", score: 85, desc: "Emotional impact" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-light text-text-primary">
                        {item.label}
                      </span>
                      <span className="font-extralight text-text-secondary">{item.score}</span>
                    </div>
                    <div className="h-1 bg-border-subtle">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={isInView ? { width: `${item.score}%` } : {}}
                        transition={{ ...springs.smooth, delay: 0.3 }}
                        className="h-full bg-accent"
                      />
                    </div>
                  </div>
                  <span className="hidden w-32 text-xs font-extralight text-text-muted sm:block">
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Masonry Grid */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate={isInView ? "animate" : "initial"}
            className="columns-2 gap-4 space-y-4"
          >
            {showcaseImages.map((image, index) => (
              <ImageCard key={image.id} image={image} index={index} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
