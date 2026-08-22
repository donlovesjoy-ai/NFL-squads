'use client'

import { useEffect, useState } from 'react'

export default function KickoffCountdown({ kickoffTime }: { kickoffTime: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function updateCountdown() {
      const kickoff = new Date(kickoffTime).getTime()
      const now = Date.now()
      const diff = kickoff - now

      if (diff <= 0) {
        setRemaining('Kickoff has started')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)

      setRemaining(
        `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`
      )
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 60000)

    return () => clearInterval(timer)
  }, [kickoffTime])

  return <p><b>Kickoff in:</b> {remaining}</p>
}