import React from 'react'

type SvgProps = React.SVGProps<SVGSVGElement> & {
  accessibilityRole?: string
}

export function Svg({ accessibilityRole, ...props }: SvgProps) {
  void accessibilityRole
  return <svg {...props} />
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

export default Svg
