import { useEffect, useRef, useState } from 'react'

export default function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  style: styleProp,
  children,
  ...props
}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const alreadyPassed = node.getBoundingClientRect().bottom < 0
    if (reduceMotion || alreadyPassed || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(node)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms`, ...styleProp }}
      {...props}
    >
      {children}
    </Tag>
  )
}
