import { Heart, ShieldCheck, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";

export type Panel = {
  lead: string;
  accent: string;
  body: string;
  illustration: string;
  cta: string;
  features?: { icon: LucideIcon; title: string; body: string }[];
  chips?: { icon: LucideIcon; label: string }[];
};

/*
 * Copy is transcribed from the frames, not invented. Panel order follows the
 * dot indicator in the frames, which is not the order of the filenames.
 */
export const PANELS: readonly Panel[] = [
  {
    lead: "Meet Baymax,",
    accent: "your family's health companion",
    body: "One safe place for all your health records, smarter insights, and answers that put your family first.",
    illustration: "/illustrations/carousel-1.png",
    cta: "Let's get started",
  },
  {
    lead: "All your health records,",
    accent: "in one secure home",
    body: "Upload, store, and organize reports, scans, prescriptions and more. Baymax keeps everything safe and easy to find.",
    illustration: "/illustrations/carousel-2.png",
    cta: "Next",
    chips: [
      { icon: Zap, label: "Lab Reports" },
      { icon: Sparkles, label: "Scans & Images" },
      { icon: Heart, label: "Prescriptions" },
      { icon: ShieldCheck, label: "Health Records" },
    ],
  },
  {
    lead: "Get answers,",
    accent: "anytime with Ask Baymax",
    body: "Your AI assistant that understands your reports, medicines, and history — and explains them in simple, trustworthy ways.",
    illustration: "/illustrations/carousel-3.png",
    cta: "Next",
    features: [
      {
        icon: Zap,
        title: "Understand in seconds",
        body: "Clear explanations for reports, conditions and treatments.",
      },
      {
        icon: Sparkles,
        title: "Personal & contextual",
        body: "Answers tailored to your health history and family profiles.",
      },
      {
        icon: Heart,
        title: "Always on your side",
        body: "Guidance you can trust, whenever you need it.",
      },
    ],
  },
  {
    lead: "Built for your family,",
    accent: "designed for trust",
    body: "Add your loved ones, set permissions, and feel confident that their health is always in safe hands.",
    illustration: "/illustrations/carousel-4.png",
    cta: "Let's get started",
    features: [
      {
        icon: Users,
        title: "Family profiles",
        body: "Add and manage family members in one place.",
      },
      {
        icon: ShieldCheck,
        title: "Permission controls",
        body: "You decide who can view, edit, or manage what.",
      },
      {
        icon: Heart,
        title: "Private & secure",
        body: "End-to-end encryption keeps your family's data completely private.",
      },
    ],
  },
];
