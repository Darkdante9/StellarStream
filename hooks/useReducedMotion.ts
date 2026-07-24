"use client"

import { useState, useEffect } from "react"

/**
 * Custom hook that detects the user's preference for reduced motion.
 * Respects the `prefers-reduced-motion` CSS media query.
 * @returns {boolean} `true` if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        setPrefersReducedMotion(mediaQuery.matches)

        const handleChange = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches)
        }

        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
    }, [])

    return prefersReducedMotion
}

