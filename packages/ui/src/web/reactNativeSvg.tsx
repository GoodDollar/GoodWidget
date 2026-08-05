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

function Svg({ accessibilityRole: _accessibilityRole, ...props }: SvgElementProps) {
  void _accessibilityRole
  return <svg {...props} />
}

export function G({ rotation, origin, transform, ...props }: SvgGroupProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <g {...props} transform={combinedTransform || undefined} />
}

export function Circle({ onPress, ...props }: SvgCircleProps) {
  return <circle {...props} onClick={onPress} />
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

export { Svg }
export default Svg
