"use client";

import React from "react";
import clsx from "clsx";
import { TextReveal } from "@/components/TextReveal";

export default function TextRevealDemo() {
  const text =
    "How you design, align, and build matters. Create realistic prototypes that allow for quick iteration on flows and states. Test the full, interactive experience to get better feedback.";

  return (
    <div className="min-h-screen w-full px-8 py-12 md:px-0 bg-[#06080b] text-white">
      <div className="pb-24 text-center text-sm text-white/30 font-mono tracking-widest uppercase">
        Scroll down to reveal text
      </div>

      <TextReveal body={text} className="relative mx-auto h-[180vh] w-full max-w-lg">
        {(tokens) => (
          <div className="sticky left-0 top-0 flex h-1/2 items-center text-3xl md:text-4xl font-medium leading-tight text-white px-4">
            <div>
              {tokens.map((token, index) => (
                <TextReveal.Token key={index} index={index}>
                  {(isActive) => (
                    <span
                      className={clsx(
                        {
                          "opacity-15": !isActive,
                          "opacity-100 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]": isActive,
                        },
                        "transition-all duration-200 inline",
                      )}
                    >
                      {token}
                    </span>
                  )}
                </TextReveal.Token>
              ))}
            </div>
          </div>
        )}
      </TextReveal>
    </div>
  );
}
