"use client"

import Link from 'next/link'
import { Button } from './button'

type FeatureSectionProps = {
  title: string
  description: string
  cta?: { href: string; label: string }
  media?: { type: 'video' | 'image'; src: string; alt?: string }
  icon?: React.ComponentType<{ className?: string }>
  reverse?: boolean
}

export function FeatureSection({ title, description, cta, media, icon: Icon, reverse }: FeatureSectionProps) {
  return (
    <section className="grid lg:grid-cols-2 gap-8 items-center">
      <div className={reverse ? 'order-2 lg:order-2' : 'order-1 lg:order-1'}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          {Icon ? <Icon className="w-4 h-4" /> : null}
          {title}
        </div>
        <h3 className="text-2xl lg:text-3xl font-bold mb-3">{title}</h3>
        <p className="text-muted-foreground text-base leading-relaxed mb-5">{description}</p>
        {cta ? (
          <Button asChild>
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : null}
      </div>
      <div className={reverse ? 'order-1 lg:order-1' : 'order-2 lg:order-2'}>
        {media ? (
          <div className="w-full rounded-xl overflow-hidden border bg-black">
            {media.type === 'video' ? (
              <video
                src={media.src}
                className="w-full h-auto"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                preload="metadata"
              />
            ) : (
              <img src={media.src} alt={media.alt || title} className="w-full h-auto object-cover" />
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}


