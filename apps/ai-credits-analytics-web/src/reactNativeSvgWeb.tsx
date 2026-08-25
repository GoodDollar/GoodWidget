import * as React from 'react'
import { View, Text } from 'tamagui'

// Minimal shim for react-native-svg web
// Only exports what we actually use from the chart components

export const Svg = ({ children, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg {...props}>{children}</svg>
)

export const Rect = ({ children, ...props }: React.SVGProps<SVGRectElement>) => (
  <rect {...props}>{children}</rect>
)

export const Circle = ({ children, ...props }: React.SVGProps<SVGCircleElement>) => (
  <circle {...props}>{children}</circle>
)

export const Ellipse = ({ children, ...props }: React.SVGProps<SVGEllipseElement>) => (
  <ellipse {...props}>{children}</ellipse>
)

export const Line = ({ children, ...props }: React.SVGProps<SVGLineElement>) => (
  <line {...props}>{children}</line>
)

export const Polyline = ({ children, ...props }: React.SVGProps<SVGPolylineElement>) => (
  <polyline {...props}>{children}</polyline>
)

export const Polygon = ({ children, ...props }: React.SVGProps<SVGPolygonElement>) => (
  <polygon {...props}>{children}</polygon>
)

export const Path = ({ children, ...props }: React.SVGProps<SVGPathElement>) => (
  <path {...props}>{children}</path>
)

export const Text = ({ children, ...props }: React.SVGProps<SVGTextElement>) => (
  <text {...props}>{children}</text>
)

export const TSpan = ({ children, ...props }: React.SVGProps<SVGTSpanElement>) => (
  <tspan {...props}>{children}</tspan>
)

export const G = ({ children, ...props }: React.SVGProps<SVGGElement>) => (
  <g {...props}>{children}</g>
)

export const Defs = ({ children, ...props }: React.SVGProps<SVGDefsElement>) => (
  <defs {...props}>{children}</defs>
)

export const LinearGradient = ({ children, ...props }: React.SVGProps<SVGLinearGradientElement>) => (
  <linearGradient {...props}>{children}</linearGradient>
)

export const RadialGradient = ({ children, ...props }: React.SVGProps<SVGRadialGradientElement>) => (
  <radialGradient {...props}>{children}</radialGradient>
)

export const Stop = ({ children, ...props }: React.SVGProps<SVGStopElement>) => (
  <stop {...props}>{children}</stop>
)

export const ClipPath = ({ children, ...props }: React.SVGProps<SVGClipPathElement>) => (
  <clipPath {...props}>{children}</clipPath>
)

export const Pattern = ({ children, ...props }: React.SVGProps<SVGPatternElement>) => (
  <pattern {...props}>{children}</pattern>
)

export const Mask = ({ children, ...props }: React.SVGProps<SVGMaskElement>) => (
  <mask {...props}>{children}</mask>
)

export const Use = ({ ...props }: React.SVGProps<SVGUseElement>) => <use {...props} />

export const Symbol = ({ children, ...props }: React.SVGProps<SVGSymbolElement>) => (
  <symbol {...props}>{children}</symbol>
)

export const ForeignObject = ({ children, ...props }: React.SVGProps<SVGForeignObjectElement>) => (
  <foreignObject {...props}>{children}</foreignObject>
)

export const Image = ({ ...props }: React.SVGProps<SVGImageElement>) => <image {...props} />

// Re-export View and Text from tamagui for any native components
// that might be used in the chart library
