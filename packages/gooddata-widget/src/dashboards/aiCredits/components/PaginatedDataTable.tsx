/**
 * PaginatedDataTable — wraps @goodwidget/ui's DataTable with pagination.
 * DataTable itself has no built-in paging (it renders every row it's given),
 * so this component owns the current-page state, slices the already-sorted
 * row array, and renders first/prev/next/last controls. Matches the
 * reference dashboard's TABLE_PAGE_SIZE (10 rows/page) and its
 * first/prev/next/last button-disable rules.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Button, ButtonText, DataTable, Text, XStack, YStack } from '@goodwidget/ui'
import type { DataTableColumnDef } from '@goodwidget/ui'

const ROWS_PER_PAGE = 10

export interface PaginatedDataTableProps<TRow extends Record<string, unknown>> {
  data: TRow[]
  columns: Array<DataTableColumnDef<TRow>>
  title?: string
  emptyMessage?: string
  testID?: string
}

export function PaginatedDataTable<TRow extends Record<string, unknown>>({
  data,
  columns,
  title,
  emptyMessage,
  testID,
}: PaginatedDataTableProps<TRow>) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE))

  // If the underlying dataset shrinks (e.g. switching from live to demo data,
  // or a live refresh returning fewer rows), clamp back to a valid page
  // instead of showing an empty page past the new last page.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return data.slice(start, start + ROWS_PER_PAGE)
  }, [data, currentPage])

  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <YStack gap="$3" width="100%" data-testid={testID}>
      <DataTable data={pageData} columns={columns} title={title} emptyMessage={emptyMessage} testID={testID ? `${testID}-table` : undefined} />

      {data.length > ROWS_PER_PAGE ? (
        <XStack alignItems="center" justifyContent="center" gap="$3" data-testid="table-pagination">
          <Button size="sm" variant="secondary" disabled={isFirstPage} onPress={() => setCurrentPage(1)} data-testid="page-first">
            <ButtonText>First</ButtonText>
          </Button>
          <Button size="sm" variant="secondary" disabled={isFirstPage} onPress={() => setCurrentPage((page) => page - 1)} data-testid="page-prev">
            <ButtonText>Prev</ButtonText>
          </Button>
          <Text variant="label" tone="dim" data-testid="page-info">
            Page {currentPage} of {totalPages}
          </Text>
          <Button size="sm" variant="secondary" disabled={isLastPage} onPress={() => setCurrentPage((page) => page + 1)} data-testid="page-next">
            <ButtonText>Next</ButtonText>
          </Button>
          <Button size="sm" variant="secondary" disabled={isLastPage} onPress={() => setCurrentPage(totalPages)} data-testid="page-last">
            <ButtonText>Last</ButtonText>
          </Button>
        </XStack>
      ) : null}
    </YStack>
  )
}
