import { BlurReveal } from "@/components/ui/blur-reveal";

export default function BlurRevealDemo() {
  return (
    <div className="flex min-h-[300px] w-full items-center justify-center bg-background px-6">
      <BlurReveal
        as="h2"
        className="text-center text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
      >
        You can just ship things.
      </BlurReveal>
    </div>
  );
}
