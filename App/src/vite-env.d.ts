/// <reference types="vite/client" />

// Allow importing SVGs as React components via SVGR
declare module '*.svg' {
  import * as React from 'react'
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}
