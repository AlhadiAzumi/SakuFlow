export default function LogoMark({ className = '' }) {
  return (
    <img
      src="/iconsakuflow.svg"
      alt=""
      aria-hidden="true"
      className={`block object-contain ${className}`}
    />
  )
}
