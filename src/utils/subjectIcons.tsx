import React from 'react';
import {
  Calculator,
  BookOpen,
  Compass,
  Leaf,
  Languages,
  Sparkles,
  Brain,
  GraduationCap,
  History,
  Globe,
  Palette,
  Music,
  Code2,
  Car,
  Coins,
  Atom,
  Rocket,
  HeartPulse,
  Lightbulb,
  TreePine,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export interface IconOption {
  id: string;
  label: string;
  IconComponent: React.ComponentType<{ className?: string }>;
}

export const CATEGORY_ICONS: IconOption[] = [
  { id: 'Sparkles', label: 'Hvězdičky / Kouzlo', IconComponent: Sparkles },
  { id: 'Brain', label: 'Mozek / Logika', IconComponent: Brain },
  { id: 'History', label: 'Historie / Dějepis', IconComponent: History },
  { id: 'Globe', label: 'Zeměkoule / Geografie', IconComponent: Globe },
  { id: 'Rocket', label: 'Vesmír / Raketa', IconComponent: Rocket },
  { id: 'Atom', label: 'Fyzika / Chemie', IconComponent: Atom },
  { id: 'Code2', label: 'Programování / IT', IconComponent: Code2 },
  { id: 'Car', label: 'Doprava / Auta', IconComponent: Car },
  { id: 'Coins', label: 'Peníze / Finance', IconComponent: Coins },
  { id: 'Palette', label: 'Výtvarné umění', IconComponent: Palette },
  { id: 'Music', label: 'Hudební výchova', IconComponent: Music },
  { id: 'HeartPulse', label: 'Zdraví a tělo', IconComponent: HeartPulse },
  { id: 'Lightbulb', label: 'Zajímavosti / Nápady', IconComponent: Lightbulb },
  { id: 'GraduationCap', label: 'Všeobecné znalosti', IconComponent: GraduationCap },
  { id: 'TreePine', label: 'Příroda / Ekologie', IconComponent: TreePine },
  { id: 'Calculator', label: 'Matematika', IconComponent: Calculator },
  { id: 'BookOpen', label: 'Jazyk a literatura', IconComponent: BookOpen },
  { id: 'Languages', label: 'Cizí jazyky', IconComponent: Languages },
  { id: 'Compass', label: 'Vlastivěda', IconComponent: Compass },
  { id: 'Leaf', label: 'Přírodověda', IconComponent: Leaf },
];

export const CATEGORY_COLORS = [
  { id: 'indigo', label: 'Fialovomodrá', bgClass: 'bg-indigo-500/20', textClass: 'text-indigo-400', borderClass: 'border-indigo-500/30' },
  { id: 'emerald', label: 'Smaragdová', bgClass: 'bg-emerald-500/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  { id: 'sky', label: 'Nebeská modrá', bgClass: 'bg-sky-500/20', textClass: 'text-sky-400', borderClass: 'border-sky-500/30' },
  { id: 'amber', label: 'Jantarová / Zlatá', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  { id: 'purple', label: 'Nachová', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400', borderClass: 'border-purple-500/30' },
  { id: 'rose', label: 'Růžovočervená', bgClass: 'bg-rose-500/20', textClass: 'text-rose-400', borderClass: 'border-rose-500/30' },
  { id: 'teal', label: 'Tyrkysová', bgClass: 'bg-teal-500/20', textClass: 'text-teal-400', borderClass: 'border-teal-500/30' },
  { id: 'orange', label: 'Oranžová', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400', borderClass: 'border-orange-500/30' },
];

export function renderSubjectOrCategoryIcon(
  subjectIdOrIcon: string,
  iconName?: string,
  className: string = 'w-4 h-4'
) {
  // First check standard subjectId keys
  if (subjectIdOrIcon === 'math') return <Calculator className={className} />;
  if (subjectIdOrIcon === 'czech') return <BookOpen className={className} />;
  if (subjectIdOrIcon === 'geography') return <Compass className={className} />;
  if (subjectIdOrIcon === 'science') return <Leaf className={className} />;
  if (subjectIdOrIcon === 'english') return <Languages className={className} />;

  // Then check iconName or subjectIdOrIcon in CATEGORY_ICONS
  const targetKey = iconName || subjectIdOrIcon;
  const found = CATEGORY_ICONS.find((item) => item.id.toLowerCase() === targetKey.toLowerCase());
  if (found) {
    const Component = found.IconComponent;
    return <Component className={className} />;
  }

  return <Sparkles className={className} />;
}
