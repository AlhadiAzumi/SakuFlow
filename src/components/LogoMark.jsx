export default function LogoMark({ className = '' }) {
  return (
    <img
      src="/iconsakunode.svg"
      alt=""
      aria-hidden="true"
      className={`block object-contain ${className}`}
    />
  )
}
