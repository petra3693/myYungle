import { useLayoutEffect, useRef } from 'react'

const FLIP_TRANSITION = 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)'

/**
 * FLIP animation for list reorder — attach ref to the list container and
 * `data-flip-id` on each direct child wrapper that should animate.
 */
export function useFlipReorder(itemIds: readonly string[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<Map<string, DOMRect>>(new Map())
  const idsKey = itemIds.join('\0')

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const nextPositions = new Map<string, DOMRect>()
    for (const id of itemIds) {
      const el = container.querySelector(`[data-flip-id="${CSS.escape(id)}"]`) as HTMLElement | null
      if (el) nextPositions.set(id, el.getBoundingClientRect())
    }

    for (const id of itemIds) {
      const el = container.querySelector(`[data-flip-id="${CSS.escape(id)}"]`) as HTMLElement | null
      if (!el) continue

      const prev = positionsRef.current.get(id)
      const next = nextPositions.get(id)
      if (!prev || !next) continue

      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue

      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.style.transition = 'none'

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = FLIP_TRANSITION
          el.style.transform = ''
        })
      })
    }

    positionsRef.current = nextPositions
  }, [idsKey, itemIds])

  return containerRef
}
