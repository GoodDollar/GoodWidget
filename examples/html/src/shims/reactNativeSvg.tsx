import React from 'react'

type SvgElementProps = React.SVGProps<SVGSVGElement> & {
  accessibilityRole?: string
}

type SvgGroupProps = React.SVGProps<SVGGElement> & {
  rotation?: string | number
  origin?: string
}

type SvgCircleProps = React.SVGProps<SVGCircleElement> & {
  onPress?: () => void
}

type SvgTextProps = React.SVGProps<SVGTextElement> & {
  rotation?: string | number
  origin?: string
}

/** Web implementation for the react-native-svg primitives used by GoodWidget dependencies. */
function Svg({ accessibilityRole: _accessibilityRole, ...props }: SvgElementProps) {
  return <svg {...props} />
}

/** Mirrors react-native-svg's G transform props with standard SVG attributes. */
export function G({ rotation, origin, transform, ...props }: SvgGroupProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <g {...props} transform={combinedTransform || undefined} />
}

/** Maps react-native-svg onPress to the browser SVG onClick event. */
export function Circle({ onPress, ...props }: SvgCircleProps) {
  return <circle {...props} onClick={onPress} />
}

/** Mirrors react-native-svg's Text rotation/origin props with a standard SVG transform; used by BarChart/LineAreaChart for in-chart axis/tick/value labels. */
export function Text({ rotation, origin, transform, ...props }: SvgTextProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <text {...props} transform={combinedTransform || undefined} />
}

/** Static SVG primitives used by @tamagui/lucide-icons need no prop translation. */
function createPassthroughSvgPrimitive(tag: string) {
  return function SvgPrimitive(props: React.SVGProps<SVGElement>) {
    return React.createElement(tag, props)
  }
}

export const Path = createPassthroughSvgPrimitive('path')
export const Line = createPassthroughSvgPrimitive('line')
export const Rect = createPassthroughSvgPrimitive('rect')
export const Polygon = createPassthroughSvgPrimitive('polygon')
export const Polyline = createPassthroughSvgPrimitive('polyline')
export const Ellipse = createPassthroughSvgPrimitive('ellipse')

/**
 * Defs/LinearGradient/Stop passthroughs — used by LineAreaChart's area-fill
 * gradients. Plain SVG already understands these tags natively via
 * React.createElement, so (unlike Circle/G/Text above) no react-native-specific
 * prop translation is needed.
 */
export const Defs = createPassthroughSvgPrimitive('defs')
export const LinearGradient = createPassthroughSvgPrimitive('linearGradient')
export const Stop = createPassthroughSvgPrimitive('stop')

export { Svg }
export default Svg
