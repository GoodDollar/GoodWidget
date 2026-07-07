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

/** Storybook web shim for the react-native-svg primitives used by the donut chart. */
export default function Svg({ accessibilityRole: _accessibilityRole, ...props }: SvgElementProps) {
  return <svg {...props} />
}

/** Mirrors react-native-svg's G transform props with standard SVG attributes. */
export function G({ rotation, origin, transform, ...props }: SvgGroupProps) {
  const rotationTransform = rotation ? `rotate(${rotation} ${origin ?? ''})`.trim() : undefined
  const combinedTransform = [transform, rotationTransform].filter(Boolean).join(' ')

  return <g {...props} transform={combinedTransform || undefined} />
}

/** Maps react-native-svg onPress to the browser SVG onClick event for stories. */
export function Circle({ onPress, ...props }: SvgCircleProps) {
  return <circle {...props} onClick={onPress} />
}
