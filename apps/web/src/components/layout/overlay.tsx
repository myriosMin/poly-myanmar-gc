import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function useOverlayBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, open])
}

export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useOverlayBehavior(open, onClose)

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background/88 p-4 backdrop-blur-xl lg:hidden">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto">{children}</div>
    </div>,
    document.body,
  )
}

export function FullscreenModal({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  eyebrow: string
  title: string
  children: ReactNode
}) {
  useOverlayBehavior(open, onClose)

  if (!open) {
    return null
  }

  return createPortal(
    <div className="modal-backdrop">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="modal-frame">
        <div className="modal-header">
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{title}</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
