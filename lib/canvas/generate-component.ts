import type { DesignSystemTokens } from "./generate-system";

export const COMPONENT_GENERATION_PROMPT = (
  tokens: DesignSystemTokens,
  prompt: string
) => `You are an expert React/Framer developer. Generate a single React component based on the user's request and the provided design system tokens.

## User Request
"${prompt}"

## Design System Tokens
${JSON.stringify(tokens, null, 2)}

## Rules
1. Export a single default functional React component
2. Use inline styles based on the design system tokens above
3. Use framer-motion for all animations (import { motion } from "framer-motion")
4. Use spring physics for transitions: { type: "spring", stiffness: ${tokens.animation.spring.smooth.stiffness}, damping: ${tokens.animation.spring.smooth.damping} }
5. The component must be self-contained — no external imports except React and framer-motion
6. Use TypeScript/TSX syntax
7. Make it responsive using CSS flexbox/grid
8. Include hover states and micro-interactions
9. Use the exact color values from the design system
10. Do NOT use Tailwind — use inline styles only (for Framer compatibility)

## Output Format
Return ONLY the TSX code, no markdown fences, no explanations. The code should start with import statements and end with the default export.`;

export type GeneratedComponent = {
  code: string;
  name: string;
  description: string;
};
