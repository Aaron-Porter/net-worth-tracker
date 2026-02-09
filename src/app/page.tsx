'use client'

import { useConvexAuth } from 'convex/react'
import { SignIn } from './components/SignIn'
import { AuthenticatedApp } from './components/AuthenticatedApp'

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#060d1f] text-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <SignIn />
  }

  return <AuthenticatedApp />
}
