'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth } from 'convex/react'
import { SignIn } from '../components/SignIn'

/**
 * Standalone projections page - redirects to the main page with projections tab
 * All calculations are now centralized and accessible from the main page
 */
export default function Projections() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to main page - the projections tab is now part of the main app
    // This preserves the route for bookmarks while centralizing all calculations
    if (!authLoading && isAuthenticated) {
      router.replace('/')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <SignIn />
  }

  // Show loading state while redirecting
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
      <div className="text-slate-400">Redirecting to dashboard...</div>
    </main>
  )
}
