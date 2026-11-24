import PixelIcon from './PixelIcon'

const ICONS = {
  utensils: 'food',
  bus: 'bus',
  shopping: 'bag',
  house: 'house',
  receipt: 'receipt',
  game: 'gamepad',
  health: 'heart',
  education: 'book',
  other: 'other',
  salary: 'money',
  business: 'rocket',
  gift: 'gift',
  piggy: 'piggy',
}

export default function CategoryIcon({ category, size = 16, className, title }) {
  const key = category?.icon || category?.id
  const label = title || category?.label
  return <PixelIcon name={ICONS[key] || key || 'other'} size={size} className={className} title={label} />
}
