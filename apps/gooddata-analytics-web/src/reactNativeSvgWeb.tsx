import React from 'react'

type SvgProps = React.SVGProps<SVGSVGElement> & {
  accessibilityRole?: string
}

type SvgGroupProps = React.SVGProps<SVGGElement> & {
  rotation?: string | number
  origin?: string
}

type SvgTextProps = React.SVGProps<SVGTextElement> & {
  rotation?: string | number
  origin?: string
}

export function Svg({ accessibilityRole, ...props }: SvgProps) {
  void accessibilityRole
  return <svg {...props} />
}

/** Mirrors react-native-svg's G transform props with a standard SVG transform; used by BarChart/LineAreaChart to group arc/bar/line elements. */
export function G({ rotation, origin, transform, ...props }: SvgGroupProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <g {...props} transform={combinedTransform || undefined} />
}

/** Mirrors react-native-svg's Text rotation/origin props with a standard SVG transform; used by BarChart/LineAreaChart for in-chart axis/tick/value labels. */
export function Text({ rotation, origin, transform, ...props }: SvgTextProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <text {...props} transform={combinedTransform || undefined} />
}

export function Path(props: React.SVGProps<SVGPathElement>) {
  return <path {...props} />
}

export function Rect(props: React.SVGProps<SVGRectElement>) {
  return <rect {...props} />
}

export function Circle(props: React.SVGProps<SVGCircleElement>) {
  return <circle {...props} />
}

export function Polyline(props: React.SVGProps<SVGPolylineElement>) {
  return <polyline {...props} />
}

export function Line(props: React.SVGProps<SVGLineElement>) {
  return <line {...props} />
}

export function Polygon(props: React.SVGProps<SVGPolygonElement>) {
  return <polygon {...props} />
}

export function Ellipse(props: React.SVGProps<SVGEllipseElement>) {
  return <ellipse {...props} />
}

/**
 * Defs/LinearGradient/Stop passthroughs — used by LineAreaChart's area-fill
 * gradients. Plain SVG already understands these tags natively, so (unlike
 * G/Text above) no react-native-specific prop translation is needed.
 */
export function Defs(props: React.SVGProps<SVGDefsElement>) {
  return <defs {...props} />
}

export function LinearGradient(props: React.SVGProps<SVGLinearGradientElement>) {
  return <linearGradient {...props} />
}

export function Stop(props: React.SVGProps<SVGStopElement>) {
  return <stop {...props} />
}

export default Svg
