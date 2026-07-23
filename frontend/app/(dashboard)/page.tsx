'use client';

import { Suspense, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { HeroStats, StreamingBalances } from '@/components/dashboard';
import { Plus, AlertCircle, ArrowRight } from "lucide-react";

/**
 * Hero Stats Loading Skeleton
 */
function HeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full" aria-label="Loading statistics">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-[0.5px] p-4 sm:p-6 h-[88px] sm:h-[104px] animate-nebula-skeleton"
        />
      ))}
    </div>
  );
}

/**
 * Streaming Balance Loading Skeleton
 */
function StreamingBalancesSkeleton() {
  return (
    <div 
      className="rounded-2xl border-[0.5px] h-[220px] w-full animate-nebula-skeleton" 
      aria-label="Loading balance tracker"
    />
  );
}

/**
 * Dashboard Content
 */
function DashboardContent() {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate dashboard loading state to showcase nebula skeleton animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full px-4 md:px-0">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-moon-text-primary">
          Dashboard
        </h1>
        <p className="text-moon-text-secondary text-sm">
          Welcome back. Here's your streaming summary.
        </p>
      </div>

      {/* Hero Stats Section */}
      <div className="w-full">
        {isLoading ? <HeroStatsSkeleton /> : <HeroStats />}
      </div>

      {/* Main Odometer + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Odometer Column */}
        <div className="lg:col-span-2 w-full">
          {isLoading ? (
            <StreamingBalancesSkeleton />
          ) : (
            <StreamingBalances 
              initialValue={48291.3847291}
              rate={0.0000247}
              assetCode="USDC"
            />
          )}
        </div>

        {/* Quick Actions Card */}
        <div className="relative group rounded-2xl border-[0.5px] border-moon-border/40 bg-moon-card/95 p-6 backdrop-blur-md shadow-[0_0_15px_rgba(124,58,237,0.1)] hover:border-moon-border/70 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all duration-300 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-moon-text-primary">Quick Actions</h2>
            <p className="text-xs text-moon-text-secondary">
              Configure, manage, and overview payments.
            </p>
            <div className="space-y-2">
              <a
                href="/create-stream"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-moon-accent hover:bg-moon-accent/90 text-black font-semibold text-sm transition-all shadow-md hover:shadow-cyan-400/20"
              >
                <span>Create Stream</span>
                <Plus className="w-4 h-4" />
              </a>
              <a
                href="/streams"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-white/10 hover:border-moon-border/60 hover:bg-white/5 text-moon-text-primary font-semibold text-sm transition-all"
              >
                <span>View Streams</span>
                <ArrowRight className="w-4 h-4 text-moon-text-secondary" />
              </a>
              <a
                href="/settings"
                className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-white/10 hover:border-moon-border/60 hover:bg-white/5 text-moon-text-primary font-semibold text-sm transition-all"
              >
                <span>Settings</span>
                <ArrowRight className="w-4 h-4 text-moon-text-secondary" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Onboarding Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Streams */}
        <Card className="lg:col-span-2 border-[0.5px] border-moon-border/40 bg-moon-card/95 backdrop-blur-md p-6 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold text-moon-text-primary">Recent Streams</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                <div className="space-y-1">
                  <p className="font-medium text-moon-text-primary text-sm">No streams active yet</p>
                  <p className="text-xs text-moon-text-secondary">
                    Create your first payment stream to start second-by-second disbursements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Onboarding Promo */}
        <div className="rounded-2xl border-[0.5px] border-moon-accent/30 bg-moon-accent/5 p-6 backdrop-blur-md flex flex-col justify-between h-full">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-moon-accent">
              <AlertCircle className="w-4 h-4" />
              <h2 className="font-heading text-base font-bold">Onboarding</h2>
            </div>
            <p className="text-moon-text-secondary text-xs leading-relaxed">
              New to StellarStream? Follow our verification guide to setup your organization profile and claim your trust badges.
            </p>
          </div>
          <div className="mt-4">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-moon-accent hover:bg-moon-accent/90 text-black font-bold text-xs transition-all"
            >
              Start Onboarding
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-moon-bg">
          <Spinner className="text-moon-accent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
