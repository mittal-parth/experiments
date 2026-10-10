'use client'

import type { ComponentProps } from 'react'
import { DrawablyButton } from 'drawably/react'

// Drawably injects its sketch <svg> into the button. A bare string child makes
// React rewrite textContent whenever the label changes, which deletes that
// svg and leaves light text on no background. A span child keeps the svg.
export function AppButton({ children, ...props }: ComponentProps<typeof DrawablyButton>) {
  return (
    <DrawablyButton {...props}>
      <span className="btn-label">{children}</span>
    </DrawablyButton>
  )
}
