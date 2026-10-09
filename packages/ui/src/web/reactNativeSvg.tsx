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

function Svg({ accessibilityRole: _accessibilityRole, ...props }: SvgElementProps) {
  void _accessibilityRole
  return <svg {...props} />
}

function buildRotationTransform(rotation: string | number | undefined, origin: string | undefined): string | undefined {
  if (!rotation) {
    return undefined
  }

  return origin ? `rotate(${rotation} ${origin})` : `rotate(${rotation})`
}

export function G({ rotation, origin, transform, ...props }: SvgGroupProps) {
  const rotationTransform = buildRotationTransform(rotation, origin)
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <g {...props} transform={combinedTransform || undefined} />
}

export function Circle({ onPress, ...props }: SvgCircleProps) {
  return <circle {...props} onClick={onPress} />
}

export function Text({ rotation, origin, transform, ...props }: SvgTextProps) {
  const rotationTransform = buildRotationTransform(rotation, origin)
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <text {...props} transform={combinedTransform || undefined} />
}

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
export const Defs = createPassthroughSvgPrimitive('defs')
export const LinearGradient = createPassthroughSvgPrimitive('linearGradient')
export const Stop = createPassthroughSvgPrimitive('stop')

export { Svg }
export default Svg
