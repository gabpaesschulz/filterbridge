type ActiveFiltersSummaryProps = {
  hasActiveFilters: boolean
  activeFilterCount: number
}

export function ActiveFiltersSummary({
  hasActiveFilters,
  activeFilterCount,
}: ActiveFiltersSummaryProps) {
  return (
    <div className={`active-filters-summary ${hasActiveFilters ? 'has-filters' : 'no-filters'}`}>
      <span className="active-filters-dot" />
      <span className="active-filters-label">
        {hasActiveFilters
          ? `${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'}`
          : 'No active filters'}
      </span>
    </div>
  )
}
