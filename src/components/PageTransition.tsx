import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
}

export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Mobile-optimized slide transition
export function SlideTransition({ children, direction = 'right' }: { 
  children: ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
}) {
  const location = useLocation()
  
  const slideVariants = {
    initial: {
      x: direction === 'right' ? '100%' : direction === 'left' ? '-100%' : 0,
      y: direction === 'down' ? '100%' : direction === 'up' ? '-100%' : 0,
      opacity: 0
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: direction === 'right' ? '-30%' : direction === 'left' ? '30%' : 0,
      y: direction === 'down' ? '-30%' : direction === 'up' ? '30%' : 0,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={slideVariants}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Fade transition for modal-like pages
export function FadeTransition({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Bottom sheet transition for mobile
export function BottomSheetTransition({ 
  children, 
  isOpen, 
  onClose 
}: { 
  children: ReactNode
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white pt-4 pb-2 px-4 z-10">
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
