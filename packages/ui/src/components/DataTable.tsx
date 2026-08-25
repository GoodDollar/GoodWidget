/**
 * DataTable — exact-value display with typed columns, formatting, and
 * sorting. Fourth and final analytics chart component (Scorecard,
 * PieDonutChart, BarChart, LineAreaChart shipped first, in PR #142 /
 * feat/analytics-components). The complement to the SVG-drawn charts: those
 * are fast at showing a pattern, this is fast at finding one exact number.
 *
 * Pure Tamagui layout — no react-native-svg, no resolveThemeColor. Unlike the
 * three SVG-based charts, every color/spacing value here is a Tamagui theme
 * token used directly as a component prop, since YStack/XStack/Text (unlike
 * SVG fill/stroke) already understand "$token" references natively.
 *
 * Follows Scorecard.tsx's structural patterns (createComponent, useTheme,
 * golden-ratio spacing, formatMetricValue) and CreditsManagementCard.tsx's
 * StatCell aesthetic ($backgroundHover cells, rounded corners).
 */
import React, { useMemo, useState } from 'react'
import { Text as TamaguiText, XStack, YStack } from 'tamagui'
import { createComponent } from '../createComponent'
import { Card } from './Card'
import { Text } from './Text'
import { formatMetricValue } from '../utils/formatMetricValue'

export type DataTableVariant = 'bare' | 'card'
export type DataTableColumnType = 'text' | 'number' | 'date' | 'currency'
export type DataTableColumnAlign = 'left' | 'center' | 'right'
export type DataTableSortDirection = 'asc' | 'desc'

export interface DataTableColumnDef<TRow extends Record<string, unknown> = Record<string, unknown>> {
  key: string
  label: string
  type?: DataTableColumnType
  align?: DataTableColumnAlign
  width?: number | string
  minWidth?: number
  formatter?: (value: unknown, row: TRow) => string
  sortable?: boolean
  truncate?: boolean
  /** Optional explanation shown in a hover/focus tooltip on this column's header — useful when `label` alone doesn't convey what the column measures. */
  description?: string
}

export interface DataTableSort {
  key: string
  direction: DataTableSortDirection
}

export interface DataTableProps<TRow extends Record<string, unknown> = Record<string, unknown>> {
  data: TRow[]
  columns: Array<DataTableColumnDef<TRow>>
  title?: string
  striped?: boolean
  compact?: boolean
  stickyHeader?: boolean
  maxHeight?: number
  defaultSort?: DataTableSort
  onSort?: (key: string, direction: DataTableSortDirection | null) => void
  emptyMessage?: string
  onRowPress?: (row: TRow, index: number) => void
  variant?: DataTableVariant
  testID?: string
  accessibilityLabel?: string
  /**
   * Derives a stable React key per row from the row's own identity (e.g. a
   * primary key field) instead of its array index. Sorting reorders `data`
   * without remounting rows, so an index-based key silently rebinds each
   * row's DOM/component instance to whatever row now occupies that index —
   * stale internal state (focus, animation, uncontrolled input values)
   * follows the position instead of the row. Optional and index-based by
   * default to stay backward compatible with existing callers.
   */
  rowKey?: (row: TRow, index: number) => string | number
}

/**
 * Golden-ratio scale/spacing constants, matching Scorecard/BarChart/
 * LineAreaChart's values so all analytics components breathe identically.
 * Re-declared locally since the source constants are private to Scorecard.tsx.
 */
const TABLE_BASE_SIZE_PX = 24
const GOLDEN_RATIO = 1.618
const MIN_FONT_SIZE_PX = 12
const clampFontSize = (px: number): number => Math.max(px, MIN_FONT_SIZE_PX)

const TITLE_SIZE_PX = clampFontSize(TABLE_BASE_SIZE_PX)
const CELL_TEXT_SIZE_PX = clampFontSize(TABLE_BASE_SIZE_PX / GOLDEN_RATIO ** 2)
const COMPACT_CELL_TEXT_SIZE_PX = clampFontSize(CELL_TEXT_SIZE_PX / GOLDEN_RATIO)

const TITLE_TO_TABLE_GAP_PX = TABLE_BASE_SIZE_PX / GOLDEN_RATIO
const CARD_PADDING_PX = TABLE_BASE_SIZE_PX
const DEFAULT_ROW_PADDING_PX = TABLE_BASE_SIZE_PX / GOLDEN_RATIO
const COMPACT_ROW_PADDING_PX = DEFAULT_ROW_PADDING_PX / GOLDEN_RATIO
const DEFAULT_MIN_COLUMN_WIDTH_PX = 60
const SORT_ARROW_GAP_PX = 4

const ALIGN_TO_JUSTIFY: Record<DataTableColumnAlign, 'flex-start' | 'center' | 'flex-end'> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

const ALIGN_TO_TEXT_ALIGN: Record<DataTableColumnAlign, 'left' | 'center' | 'right'> = {
  left: 'left',
  center: 'center',
  right: 'right',
}

const SORT_ARROW: Record<DataTableSortDirection, string> = {
  asc: '▲',
  desc: '▼',
}

const HEADER_TOOLTIP_MAX_WIDTH_PX = 240

/** Null/undefined always renders as "--" (behavioral rule 8) — checked before any custom/type formatter runs. */
const NULL_CELL_DISPLAY = '--'

/**
 * Default formatter per column type (behavioral rule 2). "currency" is
 * intentionally identical to "number" here — the spec's own prefix (e.g.
 * "$") is applied by the consumer's own `formatter`, not built in.
 */
function formatCellValue<TRow extends Record<string, unknown>>(column: DataTableColumnDef<TRow>, value: unknown, row: TRow): string {
  if (value === null || value === undefined) {
    return NULL_CELL_DISPLAY
  }

  if (column.formatter) {
    return column.formatter(value, row)
  }

  switch (column.type ?? 'text') {
    case 'number':
    case 'currency':
      return typeof value === 'number' ? formatMetricValue(value) : String(value)
    case 'date':
      return String(value)
    case 'text':
    default:
      return String(value)
  }
}

/** Numeric compare for numbers, locale-aware string compare otherwise; nullish values sort to the front. */
function compareRowsByColumn<TRow extends Record<string, unknown>>(a: TRow, b: TRow, key: string): number {
  const aValue = a[key]
  const bValue = b[key]

  if (aValue === bValue) return 0
  if (aValue === null || aValue === undefined) return -1
  if (bValue === null || bValue === undefined) return 1
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue

  return String(aValue).localeCompare(String(bValue))
}

/** Tap cycles ascending -> descending -> clear (behavioral rule 3). A tap on a different column always starts at ascending. */
function nextSortForColumn(current: DataTableSort | null, columnKey: string): DataTableSort | null {
  if (current?.key !== columnKey) return { key: columnKey, direction: 'asc' }
  if (current.direction === 'asc') return { key: columnKey, direction: 'desc' }
  return null
}

function resolveColumnFlexStyle<TRow extends Record<string, unknown>>(
  column: DataTableColumnDef<TRow>,
): { width?: number | string; minWidth: number; flex?: number; flexBasis?: number | string; flexShrink?: number } {
  const minWidth = column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH_PX

  if (column.width !== undefined) {
    return { width: column.width, minWidth, flexShrink: 0 }
  }

  // flexBasis defaults to "auto" (content-based) without this, so the header
  // row and each data row — separate flex containers — size the same column
  // to a different width depending on that row's own content (e.g. a long
  // header label vs a short numeric value). Pinning flexBasis to 0 makes every
  // row split its width purely by the flex ratio, so same-index columns land
  // on identical pixel boundaries across the header and every data row.
  return { flex: 1, flexBasis: 0, minWidth }
}

const DataTableFrame = createComponent(YStack, {
  name: 'DataTable',
  width: '100%',
})

const DataTableTitleText = createComponent(TamaguiText, {
  name: 'DataTableTitleText',
  fontFamily: '$body',
  fontWeight: '700',
  color: '$color',
  fontSize: TITLE_SIZE_PX,
  marginBottom: TITLE_TO_TABLE_GAP_PX,
})

/**
 * Single scroll container for both axes: vertical scroll comes from
 * maxHeight + overflow:auto here; horizontal scroll comes from the inner
 * content row (DataTableScrollContent) being allowed to grow past this
 * container's width. Web-only CSS (overflow/maxHeight as plain numbers),
 * matching the precedent already set by MiniAppShell/ScrollArea in this package.
 */
const DataTableScrollContainer = createComponent(YStack, {
  name: 'DataTableScrollContainer',
  width: '100%',
  overflow: 'auto' as const,
  borderRadius: '$2',
})

/** Positioned relative to the header cell (which sets `position: relative`), so it floats below the label without affecting row height. */
function HeaderTooltipBubble({ description }: { description: string }) {
  return (
    <YStack
      position="absolute"
      top="100%"
      left={0}
      marginTop={SORT_ARROW_GAP_PX}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$2"
      padding="$2"
      maxWidth={HEADER_TOOLTIP_MAX_WIDTH_PX}
      zIndex={2}
      pointerEvents="none"
      data-testid="datatable-header-tooltip"
    >
      <Text color="$color" fontSize={COMPACT_CELL_TEXT_SIZE_PX}>
        {description}
      </Text>
    </YStack>
  )
}

function HeaderCell<TRow extends Record<string, unknown>>({
  column,
  sort,
  compact,
  onPress,
}: {
  column: DataTableColumnDef<TRow>
  sort: DataTableSort | null
  compact: boolean
  onPress: () => void
}) {
  const align = column.align ?? 'center'
  const isActiveSort = sort?.key === column.key
  const flexStyle = resolveColumnFlexStyle(column)
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const hasDescription = Boolean(column.description)

  return (
    <XStack
      {...flexStyle}
      position="relative"
      alignItems="center"
      justifyContent={ALIGN_TO_JUSTIFY[align]}
      paddingVertical={compact ? COMPACT_ROW_PADDING_PX : DEFAULT_ROW_PADDING_PX}
      paddingHorizontal="$2"
      gap={SORT_ARROW_GAP_PX}
      cursor={column.sortable ? 'pointer' : hasDescription ? 'help' : 'default'}
      tabIndex={hasDescription ? 0 : undefined}
      onPress={column.sortable ? onPress : undefined}
      onMouseEnter={hasDescription ? () => setIsTooltipVisible(true) : undefined}
      onMouseLeave={hasDescription ? () => setIsTooltipVisible(false) : undefined}
      onFocus={hasDescription ? () => setIsTooltipVisible(true) : undefined}
      onBlur={hasDescription ? () => setIsTooltipVisible(false) : undefined}
    >
      {/* Weight 700 per spec's behavioral rule 4, but muted $placeholderColor
          (not full-contrast $color) — headers orient the reader to what a
          column is, same role as axis tick labels in the 3 SVG charts, so
          they get the same muted treatment even though they stay bold for
          table-header legibility. */}
      <Text
        fontWeight="700"
        color="$placeholderColor"
        fontSize={compact ? COMPACT_CELL_TEXT_SIZE_PX : CELL_TEXT_SIZE_PX}
        textAlign={ALIGN_TO_TEXT_ALIGN[align]}
        truncate
        noWrap
      >
        {column.label}
      </Text>
      {isActiveSort ? (
        <Text fontSize={compact ? COMPACT_CELL_TEXT_SIZE_PX : CELL_TEXT_SIZE_PX} color="$placeholderColor">
          {SORT_ARROW[sort.direction]}
        </Text>
      ) : null}
      {hasDescription && isTooltipVisible ? <HeaderTooltipBubble description={column.description as string} /> : null}
    </XStack>
  )
}

function DataCell<TRow extends Record<string, unknown>>({
  column,
  row,
  compact,
}: {
  column: DataTableColumnDef<TRow>
  row: TRow
  compact: boolean
}) {
  const align = column.align ?? 'center'
  const flexStyle = resolveColumnFlexStyle(column)
  const displayValue = formatCellValue(column, row[column.key], row)
  const shouldTruncate = column.truncate ?? true

  return (
    <XStack
      {...flexStyle}
      alignItems="center"
      justifyContent={ALIGN_TO_JUSTIFY[align]}
      paddingVertical={compact ? COMPACT_ROW_PADDING_PX : DEFAULT_ROW_PADDING_PX}
      paddingHorizontal="$2"
    >
      {/* Data values are the hero — full-contrast $color, mirroring the value
          labels (bar values, center metrics) in the other 3 chart components. */}
      <Text
        color="$color"
        fontSize={compact ? COMPACT_CELL_TEXT_SIZE_PX : CELL_TEXT_SIZE_PX}
        textAlign={ALIGN_TO_TEXT_ALIGN[align]}
        truncate={shouldTruncate}
        noWrap={shouldTruncate}
      >
        {displayValue}
      </Text>
    </XStack>
  )
}

function DataTableContent<TRow extends Record<string, unknown>>({
  data,
  columns,
  title,
  striped = true,
  compact = false,
  stickyHeader = true,
  maxHeight,
  defaultSort,
  onSort,
  emptyMessage = 'No data',
  onRowPress,
  testID,
  accessibilityLabel,
  rowKey,
}: Omit<DataTableProps<TRow>, 'variant'>) {
  const [sort, setSort] = useState<DataTableSort | null>(defaultSort ?? null)
  const isEmpty = data.length === 0

  const sortedData = useMemo(() => {
    if (!sort) return data
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...data].sort((a, b) => direction * compareRowsByColumn(a, b, sort.key))
  }, [data, sort])

  const resolvedAccessibilityLabel =
    accessibilityLabel ?? `${title ?? 'Data table'}, ${data.length} ${data.length === 1 ? 'row' : 'rows'}`

  function handleHeaderPress(column: DataTableColumnDef<TRow>) {
    if (!column.sortable) return
    const next = nextSortForColumn(sort, column.key)
    setSort(next)
    onSort?.(column.key, next?.direction ?? null)
  }

  return (
    <DataTableFrame testID={testID} data-testid={testID} accessibilityLabel={resolvedAccessibilityLabel}>
      {title ? <DataTableTitleText>{title}</DataTableTitleText> : null}
      <DataTableScrollContainer style={{ maxHeight: maxHeight ?? undefined }}>
        {/* width: 'max-content' lets this content grow past the scroll container so wide
            column sets trigger horizontal scroll instead of squeezing every column down. */}
        <YStack style={{ width: 'max-content', minWidth: '100%' }}>
          <XStack
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
            backgroundColor="$background"
            style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : undefined}
          >
            {columns.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} compact={compact} onPress={() => handleHeaderPress(column)} />
            ))}
          </XStack>

          {isEmpty ? (
            <XStack paddingVertical={compact ? COMPACT_ROW_PADDING_PX : DEFAULT_ROW_PADDING_PX} justifyContent="center">
              <Text color="$placeholderColor" fontSize={compact ? COMPACT_CELL_TEXT_SIZE_PX : CELL_TEXT_SIZE_PX}>
                {emptyMessage}
              </Text>
            </XStack>
          ) : (
            sortedData.map((row, index) => (
              <XStack
                key={rowKey ? rowKey(row, index) : index}
                backgroundColor={striped && index % 2 === 0 ? '$backgroundHover' : 'transparent'}
                cursor={onRowPress ? 'pointer' : 'default'}
                pressStyle={onRowPress ? { opacity: 0.7 } : undefined}
                onPress={onRowPress ? () => onRowPress(row, index) : undefined}
              >
                {columns.map((column) => (
                  <DataCell key={column.key} column={column} row={row} compact={compact} />
                ))}
              </XStack>
            ))
          )}
        </YStack>
      </DataTableScrollContainer>
    </DataTableFrame>
  )
}

export function DataTable<TRow extends Record<string, unknown> = Record<string, unknown>>({
  variant = 'bare',
  ...contentProps
}: DataTableProps<TRow>) {
  if (variant === 'card') {
    return (
      <Card padding={CARD_PADDING_PX}>
        <DataTableContent {...contentProps} />
      </Card>
    )
  }

  return <DataTableContent {...contentProps} />
}
