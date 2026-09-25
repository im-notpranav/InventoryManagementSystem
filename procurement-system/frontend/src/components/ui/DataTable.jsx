import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Generic data table.
 * columns: [{ key, header, render?(row), sortValue?(row), align?, width?, className?, hideBelow?: 'md'|'lg' }]
 * rows: array; rowKey: string | fn(row)
 * expandable?: (row) => ReactNode | null   — clicking a row toggles the panel
 * onRowClick?: (row) => void
 * loading, emptyTitle, emptyDescription, emptyAction
 */
export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  loading = false,
  skeletonRows = 6,
  expandable,
  onRowClick,
  rowClassName,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon: EmptyIcon = Inbox,
  emptyAction,
  initialSort,
  dense = false,
  stickyHeader = true,
  footer,
  className = '',
  maxHeight,
}) {
  const [sort, setSort] = useState(initialSort || null); // { key, dir: 'asc'|'desc' }
  const [expanded, setExpanded] = useState(null);

  // Track the scroller's own width so we know which `hideBelow` columns the container
  // queries have dropped (thresholds mirror .col-md / .col-lg in index.css). Those
  // columns are then shown inside the expanded row instead of disappearing.
  const wrapRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(Infinity);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWrapWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const hiddenCols = columns.filter((c) => (c.hideBelow === 'md' && wrapWidth < 720) || (c.hideBelow === 'lg' && wrapWidth < 1200));
  const canExpand = !!expandable || hiddenCols.length > 0;

  const keyOf = (row, i) => (typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey] ?? i);

  const sorted = useMemo(() => {
    if (!sort || !rows) return rows || [];
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const val = (r) => (col.sortValue ? col.sortValue(r) : r?.[col.key]);
    return [...rows].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (col) => {
    if (col.sortable === false || (!col.sortValue && col.render && !col.key)) return;
    setSort((s) => {
      if (!s || s.key !== col.key) return { key: col.key, dir: 'asc' };
      if (s.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  };

  // Container-query driven (see .col-md / .col-lg in index.css) so columns drop when the
  // table itself is narrow, not when the browser window is.
  const hideClass = (c) => (c.hideBelow === 'md' ? 'col-md' : c.hideBelow === 'lg' ? 'col-lg' : '');
  const alignClass = (c) => (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left');
  const colCount = columns.length + (canExpand ? 1 : 0);
  const pad = dense ? '!py-2' : '';

  return (
    <div className={cn('surface overflow-hidden', className)}>
      <div ref={wrapRef} className="ui-table-wrap overflow-x-auto" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        <table className="ui-table">
          <thead>
            <tr>
              {canExpand && <th className={cn('w-8', !stickyHeader && '!static')} />}
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(alignClass(c), hideClass(c), !stickyHeader && '!static', sortable && 'cursor-pointer hover:text-slate-800', c.headerClassName)}
                    onClick={() => sortable && toggleSort(c)}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {sortable &&
                        (active ? (
                          sort.dir === 'asc' ? (
                            <ChevronUp className="w-3 h-3 text-brand-600" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-brand-600" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 text-slate-300" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {canExpand && <td />}
                  {columns.map((c) => (
                    <td key={c.key} className={cn(hideClass(c), pad)}>
                      <div className="skeleton h-4" style={{ width: `${45 + ((i * 17 + c.key.length * 7) % 45)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="!py-14">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 grid place-items-center text-slate-400">
                      <EmptyIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
                    {emptyDescription && <p className="text-xs text-slate-500 max-w-xs">{emptyDescription}</p>}
                    {emptyAction && <div className="mt-2">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => {
                const k = keyOf(row, i);
                const isOpen = expanded === k;
                const clickable = !!onRowClick || canExpand;
                const panel = expandable && isOpen ? expandable(row) : null;
                const extras = isOpen && hiddenCols.length > 0 ? hiddenCols : [];
                return (
                  <Fragment key={k}>
                    <tr
                      className={cn(clickable && 'is-clickable', isOpen && 'bg-brand-50/40', typeof rowClassName === 'function' ? rowClassName(row) : rowClassName)}
                      onClick={() => {
                        if (canExpand) setExpanded(isOpen ? null : k);
                        onRowClick?.(row);
                      }}
                    >
                      {canExpand && (
                        <td className={cn('!pr-0 text-slate-400', pad)}>
                          <ChevronRight className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-90 text-brand-600')} />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.key} className={cn(alignClass(c), hideClass(c), pad, c.className)}>
                          {c.render ? c.render(row, i) : row?.[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                    {canExpand && (
                      <tr className="!bg-transparent">
                        <td colSpan={colCount} className="!p-0 !border-b-0">
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="border-b border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-5 space-y-5">
                                  {extras.length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                      {extras.map((c) => {
                                        const isAction = !c.header;
                                        return (
                                          <div key={c.key} className={cn('min-w-0', isAction && 'col-span-2 pt-1 [&_.flex]:justify-start')} onClick={isAction ? (e) => e.stopPropagation() : undefined}>
                                            {!isAction && <p className="text-[10px] uppercase tracking-[0.1em] text-slate-400 font-semibold mb-1">{c.header}</p>}
                                            <div className="text-sm text-slate-800 break-words">{c.render ? c.render(row, i) : row?.[c.key] ?? '—'}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {panel}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-3 bg-slate-50/40">{footer}</div>}
    </div>
  );
}
