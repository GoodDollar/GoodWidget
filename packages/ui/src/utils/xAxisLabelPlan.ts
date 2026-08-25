/**
 * Deterministic x-axis category-label placement, shared by LineAreaChart and
 * BarChart (vertical layout) — replaces the old fixed "every Nth label" skip
 * factor, which could still leave the last category unlabeled or two labels
 * touching once real (not average-case) label widths were snapped onto
 * unevenly-spaced real data points. Works from measured label width and
 * plot geometry only, so it holds for any category count, label content
 * (dates, numbers, arbitrary strings), or container width.
 */

export interface XAxisLabelPlanEntry {
  index: number
  xPixel: number
  textAnchor: 'start' | 'middle' | 'end'
}

export interface XAxisLabelPlanInput {
  categoryCount: number
  /** Maps a category index to its pixel position along the axis. Index 0 must be the leftmost category, with 0 itself reserved for the axis origin (the left edge of the reserved y-axis-label gutter). */
  xPixelForIndex: (index: number) => number
  /** Widest formatted label actually in use, at the font size it will render at — not a fixed per-dashboard guess. */
  labelWidthPx: number
}

/**
 * Plans which category indexes get an x-axis label and how each is anchored,
 * guaranteeing: the first and last category always render; no two rendered
 * labels' bounding boxes overlap; no label spills left of the axis origin
 * into the reserved y-axis-label gutter.
 */
export function computeXAxisLabelPlan({
  categoryCount,
  xPixelForIndex,
  labelWidthPx,
}: XAxisLabelPlanInput): XAxisLabelPlanEntry[] {
  if (categoryCount <= 0) return []
  if (categoryCount === 1) {
    return [{ index: 0, xPixel: xPixelForIndex(0), textAnchor: 'middle' }]
  }

  const lastIndex = categoryCount - 1
  const firstAnchor: XAxisLabelPlanEntry = { index: 0, xPixel: xPixelForIndex(0), textAnchor: 'start' }
  const lastAnchor: XAxisLabelPlanEntry = { index: lastIndex, xPixel: xPixelForIndex(lastIndex), textAnchor: 'end' }
  // The anchors' own pixel positions are the real span to distribute labels
  // across — NOT 0..plotWidthPx. A point-per-category axis (LineAreaChart)
  // has them coincide with the plot edges, but a bar-center axis (BarChart)
  // anchors half a bar-slot inward on each side, and hardcoding the plot
  // edges there would misjudge both how much room is available and where
  // "the middle" actually is.
  const anchorSpanPx = lastAnchor.xPixel - firstAnchor.xPixel

  // Step 3: minimum gap between adjacent label centers is half a label width;
  // two full-width labels plus that gap is the minimum safe center spacing.
  const minGapPx = labelWidthPx * 0.5
  const minCenterToCenterPx = labelWidthPx + minGapPx

  // Step 4: how many intermediate labels fit between the two mandatory anchors.
  const maxTotalLabels = Math.max(2, Math.floor(anchorSpanPx / minCenterToCenterPx) + 1)
  const intermediateSlotCount = Math.max(0, Math.min(lastIndex - 1, maxTotalLabels - 2))

  // Step 5: equally spaced ideal pixel positions strictly between the anchors.
  const idealIntermediatePixels = Array.from(
    { length: intermediateSlotCount },
    (_, slotIndex) => firstAnchor.xPixel + (anchorSpanPx * (slotIndex + 1)) / (intermediateSlotCount + 1),
  )

  // Steps 6-7: snap each ideal position to the nearest real category index;
  // an exact tie (fraction === 0.5) resolves to the earlier index, deterministically.
  const snappedIndexes = idealIntermediatePixels.map((idealPixelPos) => {
    const idealFractionalIndex = ((idealPixelPos - firstAnchor.xPixel) / anchorSpanPx) * lastIndex
    const flooredIndex = Math.floor(idealFractionalIndex)
    const fraction = idealFractionalIndex - flooredIndex
    const snapped = fraction > 0.5 ? flooredIndex + 1 : flooredIndex
    return Math.min(lastIndex - 1, Math.max(1, snapped))
  })

  // Multiple ideal positions can snap to the same real index at low category
  // counts — dedupe while keeping ascending order.
  const intermediateEntries: XAxisLabelPlanEntry[] = Array.from(new Set(snappedIndexes))
    .sort((a, b) => a - b)
    .map((index) => ({ index, xPixel: xPixelForIndex(index), textAnchor: 'middle' as const }))

  // Step 8: collision check, left to right. Anchors are mandatory (step 1
  // outranks step 8), so intermediates are the only entries ever dropped —
  // first against whichever label precedes them, then a final pass makes
  // room for the last anchor by dropping intermediates that crowd it.
  const kept: XAxisLabelPlanEntry[] = [firstAnchor]
  for (const entry of intermediateEntries) {
    const previous = kept[kept.length - 1]
    if (entry.xPixel - previous.xPixel >= minCenterToCenterPx) {
      kept.push(entry)
    }
  }
  while (kept.length > 1 && lastAnchor.xPixel - kept[kept.length - 1].xPixel < minCenterToCenterPx) {
    kept.pop()
  }
  kept.push(lastAnchor)

  // Step 9: a middle-anchored label whose left edge would spill past the
  // axis origin encroaches on the reserved y-axis-label gutter — drop it.
  // (The first anchor is exempt: it's start-anchored and extends rightward only.)
  return kept.filter((entry) => entry.textAnchor !== 'middle' || entry.xPixel - labelWidthPx / 2 >= 0)
}
