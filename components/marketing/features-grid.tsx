"use client";

// Isometric layered squares illustration (FIG 0.2)
function LayeredSquaresIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base platform */}
      <path
        d="M100 180L20 140V120L100 160L180 120V140L100 180Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Layer 1 */}
      <path
        d="M100 160L20 120V100L100 140L180 100V120L100 160Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Layer 2 */}
      <path
        d="M100 140L20 100V80L100 120L180 80V100L100 140Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Layer 3 */}
      <path
        d="M100 120L20 80V60L100 100L180 60V80L100 120Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Top square with inner detail */}
      <path
        d="M100 100L20 60V40L100 80L180 40V60L100 100Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M100 90L60 70V60L100 80L140 60V70L100 90Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

// Isometric cubes cluster illustration (FIG 0.3)
function CubesClusterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Large cube back */}
      <path
        d="M130 50L170 70V110L130 90V50Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M130 50L90 70V110L130 90V50Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M90 70L130 90L170 70"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Medium cube front left */}
      <path
        d="M60 100L100 120V160L60 140V100Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M60 100L20 120V160L60 140V100Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M20 120L60 140L100 120"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Small cube front right */}
      <path
        d="M120 110L150 125V155L120 140V110Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M120 110L90 125V155L120 140V110Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M90 125L120 140L150 125"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

// Isometric file/document stack illustration (FIG 0.4)
function FileStackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base platform */}
      <path
        d="M100 170L40 140V120L100 150L160 120V140L100 170Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* File stack layers */}
      <path
        d="M70 135V95L130 65V105L70 135Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M70 135L50 125V85L70 95V135Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M50 85L110 55L130 65L70 95"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Second file */}
      <path
        d="M80 145V105L140 75V115L80 145Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M80 145L60 135V95L80 105V145Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Third file */}
      <path
        d="M90 155V115L150 85V125L90 155Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M90 155L70 145V105L90 115V155Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Top document - larger */}
      <path
        d="M100 165V115L170 80V130L100 165Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M100 165L70 150V100L100 115V165Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M70 100L140 65L170 80L100 115"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      {/* Document lines */}
      <path
        d="M85 125L120 107.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M85 135L120 117.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

const features = [
  {
    fig: "FIG 0.2",
    icon: LayeredSquaresIcon,
    title: "Built for purpose",
    description:
      "Studio OS is shaped by the practices and principles of world-class design teams.",
  },
  {
    fig: "0.3",
    icon: CubesClusterIcon,
    title: "Powered by AI",
    description:
      "Designed for workflows shared by humans and agents.",
  },
  {
    fig: "0.4",
    icon: FileStackIcon,
    title: "Designed for speed",
    description:
      "Reduces noise and restores momentum.",
  },
];

export function FeaturesGrid() {
  return (
    <section className="border-y border-neutral-800 bg-black py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-px bg-neutral-800 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.fig}
              className="group bg-black p-8 transition-colors duration-300 hover:bg-neutral-950"
            >
              {/* Fig label */}
              <span className="font-mono text-xs text-neutral-600">
                {feature.fig}
              </span>

              {/* Icon */}
              <feature.icon className="mx-auto my-12 h-40 w-40 text-neutral-700 transition-colors duration-300 group-hover:text-neutral-600" />

              {/* Content */}
              <h3 className="mb-3 text-lg font-light text-white">
                {feature.title}
              </h3>
              <p className="text-sm font-extralight leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
