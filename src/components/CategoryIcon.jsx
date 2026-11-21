import {
  BriefcaseBusiness,
  Bus,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  ReceiptText,
  Rocket,
  ShoppingBag,
  Sparkles,
  Utensils,
} from 'lucide-react'

const ICONS = {
  utensils: Utensils,
  bus: Bus,
  shopping: ShoppingBag,
  house: House,
  receipt: ReceiptText,
  game: Gamepad2,
  health: HeartPulse,
  education: GraduationCap,
  other: Sparkles,
  salary: BriefcaseBusiness,
  business: Rocket,
  gift: Gift,
  piggy: PiggyBank,
}

export default function CategoryIcon({ category, size = 16, strokeWidth = 2, className }) {
  const Icon = ICONS[category?.icon || category?.id] || Sparkles
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />
}
