'use client'

import { ReactNode } from 'react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export function SectionPage({
  eyebrow,
  title,
  description,
  children,
}: SectionPageProps) {
  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-8 py-12 lg:px-14 lg:py-16">
        <header className="max-w-4xl">
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            {eyebrow}
          </p>

          <h1 className="mt-3 font-serif text-5xl tracking-tight lg:text-6xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground lg:text-lg">
            {description}
          </p>
        </header>

        <div className="mt-16">
          {children}
        </div>
      </div>
    </div>
  )
}