import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CAMPUS } from '@/constants/colors';

type Align = 'left' | 'center' | 'right';
type SortDir = 'asc' | 'desc';
type SortState = { key: string; dir: SortDir } | null;

export type Column<T> = {
  /** Unique column id (also used as the default sort/search accessor). */
  key: string;
  /** Header label shown in the table header. */
  label: string;
  /**
   * Fixed width in px. Omit (or pass a non-number) to let the column
   * share the remaining space responsively.
   */
  width?: number | string;
  /** Text alignment inside cells. Defaults to left. */
  align?: Align;
  /** Custom renderer for a cell. Receives (item, value). */
  render?: (item: T, value: any) => React.ReactNode;
  /** Whether clicking the header sorts by this column. */
  sortable?: boolean;
  /** Optional sort accessor for computed/virtual columns. */
  sortValue?: (item: T) => string | number | null | undefined;
  /** Optional search accessor for computed/virtual columns. */
  searchValue?: (item: T) => string | number | null | undefined;
  /** Set false to keep this column out of search results. */
  searchable?: boolean;
  /** Minimum width used when the table scrolls horizontally. */
  minWidth?: number;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  /** Accessor for a stable row id (defaults to 'id'). */
  rowId?: (item: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  onRowPress?: (item: T) => void;
  selectedIds?: Set<string | number>;
  onToggleRow?: (id: string | number) => void;
  /** Alternating row backgrounds (on by default). */
  stripe?: boolean;
  /** Card heading shown above the table. */
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show the built-in search field. Defaults to true. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Initial sort order applied to the table. */
  initialSort?: SortState;
  /** Rows rendered per page. Use 0 to show everything at once. */
  pageSize?: number;
  /** Small helper line shown in the table footer. */
  footerNote?: string;
  /** Tightens row height for dense data sets. */
  dense?: boolean;
};

export default function DataTable<T>({
  data,
  columns,
  rowId = (item: any) => (item as any).id ?? item,
  loading,
  emptyTitle = 'No records found',
  emptyMessage = 'There is nothing to show here yet.',
  emptyIcon = 'folder-outline',
  onRowPress,
  selectedIds,
  onToggleRow,
  stripe = true,
  title,
  subtitle,
  icon = 'list-outline',
  searchable = true,
  searchPlaceholder = 'Search records…',
  initialSort = null,
  pageSize = 12,
  footerNote,
  dense = false,
}: DataTableProps<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const [cardWidth, setCardWidth] = useState(0);
  const [sort, setSort] = useState<SortState>(initialSort);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  const cardPadding = windowWidth < 480 ? 14 : 18;
  const outerWidth = cardWidth || Math.min(windowWidth, 1000) - cardPadding * 2;
  const availableWidth = Math.max(0, outerWidth - 2);

  /* ---------------------------- Width resolution --------------------------- */
  const minFlexWidth = 132;
  const trailingSlot = onRowPress && !onToggleRow ? 34 : 0;
  const leadingSlot = selectedIds && onToggleRow ? 34 : 0;
  const extraWidth = trailingSlot + leadingSlot;
  const fixedTotal = columns.reduce(
    (sum, col) => sum + (typeof col.width === 'number' ? col.width : 0),
    0
  );
  const flexColumns = columns.filter((col) => typeof col.width !== 'number');
  const minTableWidth =
    fixedTotal + flexColumns.length * minFlexWidth + extraWidth;
  const needsScroll = availableWidth > 0 && minTableWidth > availableWidth;

  const widths = useMemo(() => {
    const usable = Math.max(0, availableWidth - extraWidth);
    const fallback = needsScroll
      ? minFlexWidth
      : Math.max(
          minFlexWidth,
          (usable - fixedTotal) / Math.max(1, flexColumns.length)
        );
    const base = columns.map((col) =>
      typeof col.width === 'number' ? col.width : fallback
    );
    const used = base.reduce((sum, value) => sum + value, 0);

    if (!needsScroll && flexColumns.length === 0 && usable > used) {
      // Scale fixed columns evenly so the table fills the card on wide screens.
      const factor = usable / used;
      return base.map((value) => value * factor);
    }
    return base;
  }, [columns, availableWidth, extraWidth, fixedTotal, flexColumns.length, needsScroll]);

  const tableWidth = Math.max(availableWidth, minTableWidth);

  /* ------------------------------- Filtering ------------------------------- */
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) =>
      columns.some((col) => {
        if (col.searchable === false) return false;
        const raw = col.searchValue
          ? col.searchValue(item)
          : (item as any)[col.key];
        if (raw == null) return false;
        if (typeof raw === 'object') return false;
        return String(raw).toLowerCase().includes(q);
      })
    );
  }, [data, columns, query]);

  /* -------------------------------- Sorting -------------------------------- */
  const sorted = useMemo(() => {
    if (!sort) return searched;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return searched;

    return [...searched].sort((a, b) => {
      const av = col.sortValue
        ? col.sortValue(a)
        : (a as any)[sort.key];
      const bv = col.sortValue
        ? col.sortValue(b)
        : (b as any)[sort.key];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [searched, sort, columns]);

  /* ------------------------------ Pagination ------------------------------- */
  useEffect(() => {
    setPage(1);
  }, [query, sort]);

  const canPaginate = pageSize > 0;
  const visible = canPaginate
    ? sorted.slice(0, page * pageSize)
    : sorted;
  const hasMore = canPaginate && visible.length < sorted.length;

  /* -------------------------------- Helpers -------------------------------- */
  const isSelected = (id: string | number) =>
    selectedIds ? selectedIds.has(id) : false;

  const headerPress = (col: Column<T>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (prev?.key === col.key) {
        return prev.dir === 'asc' ? { key: col.key, dir: 'desc' } : null;
      }
      return { key: col.key, dir: 'asc' };
    });
  };

  const alignStyle: Record<Align, object> = {
    left: { textAlign: 'left' },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' },
  };

  const cellAlignment = (align?: Align) =>
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

  const cellValue = (item: T, col: Column<T>) => (item as any)[col.key];

  const renderCell = (item: T, col: Column<T>) => {
    if (col.render) return col.render(item, cellValue(item, col));
    const value = cellValue(item, col);
    return (
      <Text
        style={[styles.cellText, col.align && alignStyle[col.align]]}
        numberOfLines={2}
      >
        {value == null || value === '' ? '—' : String(value)}
      </Text>
    );
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (Math.abs(next - cardWidth) > 0.5) setCardWidth(next);
  };

  const showToolbar = !loading && data.length > 0 && searchable;
  const count = sorted.length;
  const total = data.length;

  return (
    <View style={styles.card} onLayout={handleLayout}>
      <View style={styles.topAccent} />

      {/* Card heading */}
      {(title || subtitle) && (
        <View style={[styles.cardHeader, { paddingHorizontal: cardPadding }]}>
          <View style={styles.titleIcon}>
            <Ionicons name={icon} size={18} color={CAMPUS.accent} />
          </View>
          <View style={styles.titleCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.countChip}>
            <Text style={styles.countChipValue}>{count}</Text>
            <Text style={styles.countChipLabel}>
              {count === 1 ? 'row' : 'rows'}
            </Text>
          </View>
        </View>
      )}

      {/* Toolbar */}
      {showToolbar && !loading && (
        <View
          style={[
            styles.toolbar,
            { paddingHorizontal: cardPadding },
            !title && !subtitle && styles.toolbarStandalone,
          ]}
        >
          {searchable ? (
            <View
              style={[
                styles.searchWrap,
                focused && styles.searchWrapFocused,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={focused ? CAMPUS.accent : CAMPUS.textFaint}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={searchPlaceholder}
                placeholderTextColor={CAMPUS.textFaint}
                style={[
                  styles.searchInput,
                  Platform.OS === 'web'
                    ? ({ outlineStyle: 'none' } as any)
                    : null,
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={searchPlaceholder}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={CAMPUS.textFaint}
                  />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Text style={styles.resultText} numberOfLines={1}>
            {query
              ? `${count} of ${total}`
              : `${total} record${total === 1 ? '' : 's'}`}
          </Text>
        </View>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={styles.skeletonRow}>
              <View
                style={[
                  styles.skeletonBar,
                  { width: `${52 + (row % 3) * 12}%` },
                ]}
              />
              <View style={[styles.skeletonBar, { width: '16%' }]} />
            </View>
          ))}
          <View style={styles.skeletonCaption}>
            <ActivityIndicator size="small" color={CAMPUS.accent} />
            <Text style={styles.skeletonText}>Loading records…</Text>
          </View>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name={emptyIcon} size={30} color={CAMPUS.accent} />
          </View>
          <Text style={styles.emptyTitle}>
            {query ? 'No matching records' : emptyTitle}
          </Text>
          <Text style={styles.emptyMessage}>
            {query
              ? `Nothing matches “${query}”. Try a different search term.`
              : emptyMessage}
          </Text>
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.emptyAction}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={14} color={CAMPUS.accent} />
              <Text style={styles.emptyActionText}>Clear search</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={needsScroll}
            nestedScrollEnabled
            bounces={false}
            style={styles.horizontalScroller}
            contentContainerStyle={{ width: tableWidth }}
          >
            <View style={{ width: tableWidth }}>
              {/* Header */}
              <View style={styles.headerRow}>
                {selectedIds && onToggleRow ? (
                  <View style={styles.selectHeaderSpacer} />
                ) : null}

                {columns.map((col, index) => {
                  const active = sort?.key === col.key;
                  return (
                    <View
                      key={col.key}
                      style={[
                        styles.headerCell,
                        { width: widths[index] },
                      ]}
                    >
                      <Pressable
                        onPress={() => headerPress(col)}
                        disabled={!col.sortable}
                        hitSlop={6}
                        accessibilityRole={col.sortable ? 'button' : undefined}
                        accessibilityState={
                          col.sortable ? { selected: active } : undefined
                        }
                        style={[
                          styles.headerPress,
                          {
                            justifyContent:
                              col.align === 'center'
                                ? 'center'
                                : col.align === 'right'
                                  ? 'flex-end'
                                  : 'flex-start',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.headerLabel,
                            col.align && alignStyle[col.align],
                            col.sortable && styles.headerSortable,
                            active && styles.headerLabelActive,
                          ]}
                          numberOfLines={1}
                        >
                          {col.label}
                        </Text>
                        {col.sortable ? (
                          <Ionicons
                            name={
                              active
                                ? sort?.dir === 'asc'
                                  ? 'arrow-up'
                                  : 'arrow-down'
                                : 'swap-vertical-outline'
                            }
                            size={11}
                            color={
                              active ? CAMPUS.accent : CAMPUS.textFaint
                            }
                            style={styles.sortIcon}
                          />
                        ) : null}
                      </Pressable>
                    </View>
                  );
                })}

                {onRowPress && !onToggleRow ? (
                  <View style={styles.chevronCell} />
                ) : null}
              </View>

              {/* Body */}
              {visible.map((item, rowIndex) => {
                const id = rowId(item);
                const selected = isSelected(id);
                const hovered = hoveredId === id;
                const pressable = Boolean(onRowPress || onToggleRow);
                const isLast = rowIndex === visible.length - 1;

                return (
                  <Pressable
                    key={String(id)}
                    onPress={() => {
                      if (onToggleRow) onToggleRow(id);
                      else if (onRowPress) onRowPress(item);
                    }}
                    disabled={!pressable}
                    onHoverIn={() => setHoveredId(id)}
                    onHoverOut={() =>
                      setHoveredId((current) =>
                        current === id ? null : current
                      )
                    }
                    accessibilityRole={pressable ? 'button' : undefined}
                    style={({ pressed }) => [
                      styles.row,
                      dense && styles.rowDense,
                      stripe && rowIndex % 2 === 1 && styles.rowStripe,
                      hovered && styles.rowHovered,
                      pressed && styles.rowPressed,
                      selected && styles.rowSelected,
                      isLast && styles.rowLast,
                    ]}
                  >
                    {hovered && !selected ? (
                      <View style={styles.hoverAccent} />
                    ) : null}

                    {selectedIds && onToggleRow ? (
                      <View style={styles.selectBox}>
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={selected ? CAMPUS.accent : CAMPUS.textFaint}
                        />
                      </View>
                    ) : null}

                    {columns.map((col, colIndex) => (
                      <View
                        key={col.key}
                        style={[
                          styles.cell,
                          { width: widths[colIndex] },
                          {
                            alignItems: cellAlignment(col.align),
                          },
                        ]}
                      >
                        {renderCell(item, col)}
                      </View>
                    ))}

                    {pressable && !onToggleRow ? (
                      <View style={styles.chevronCell}>
                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={hovered ? CAMPUS.accent : CAMPUS.textFaint}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {(canPaginate || footerNote) && (
            <View
              style={[styles.footer, { paddingHorizontal: cardPadding }]}
            >
              <Text style={styles.footerText}>
                {canPaginate
                  ? `Showing ${visible.length} of ${sorted.length}`
                  : `${sorted.length} record${sorted.length === 1 ? '' : 's'}`}
              </Text>

              {footerNote ? (
                <Text style={styles.footerNote} numberOfLines={1}>
                  {footerNote}
                </Text>
              ) : null}

              {hasMore ? (
                <View style={styles.footerActions}>
                  <Pressable
                    onPress={() => setPage((p) => p + 1)}
                    style={({ pressed }) => [
                      styles.footerButton,
                      pressed && styles.footerButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.footerButtonText}>Show more</Text>
                    <Ionicons
                      name="chevron-down"
                      size={13}
                      color={CAMPUS.accent}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setPage(Number.MAX_SAFE_INTEGER)}
                    style={({ pressed }) => [
                      styles.footerButtonGhost,
                      pressed && styles.footerButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.footerButtonGhostText}>Show all</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#14161A',
    borderWidth: 1,
    borderColor: CAMPUS.border,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: Platform.OS === 'web' ? 0.28 : 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  topAccent: {
    height: 2,
    width: '100%',
    backgroundColor: CAMPUS.accent,
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 14,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.28)',
  },
  titleCopy: { flex: 1, minWidth: 0 },
  title: {
    color: CAMPUS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: CAMPUS.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.28)',
  },
  countChipValue: {
    color: CAMPUS.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  countChipLabel: {
    color: CAMPUS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
  },
  toolbarStandalone: { paddingTop: 16 },
  searchWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: CAMPUS.inputBg,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  searchWrapFocused: {
    borderColor: 'rgba(212,212,216,0.55)',
    backgroundColor: 'rgba(212,212,216,0.06)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: CAMPUS.text,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearButton: { padding: 2 },
  resultText: {
    fontFamily: CAMPUS.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    color: CAMPUS.textFaint,
    textTransform: 'uppercase',
  },
  horizontalScroller: { width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerCell: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  headerLabel: {
    fontFamily: CAMPUS.mono,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: CAMPUS.textFaint,
    textTransform: 'uppercase',
  },
  headerSortable: { color: CAMPUS.textMuted },
  headerLabelActive: { color: CAMPUS.accent },
  sortIcon: { marginTop: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingVertical: 11,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.055)',
  },
  rowDense: { minHeight: 46, paddingVertical: 8 },
  rowStripe: { backgroundColor: 'rgba(255,255,255,0.022)' },
  rowHovered: { backgroundColor: 'rgba(212,212,216,0.06)' },
  rowPressed: { backgroundColor: 'rgba(212,212,216,0.10)' },
  rowSelected: {
    backgroundColor: 'rgba(212,212,216,0.10)',
  },
  rowLast: { borderBottomWidth: 0 },
  hoverAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 3,
    backgroundColor: CAMPUS.accent,
    opacity: 0.85,
  },
  cell: {
    minWidth: 0,
    paddingHorizontal: 14,
  },
  cellText: {
    fontSize: 12.5,
    color: CAMPUS.text,
    lineHeight: 18,
  },
  selectHeaderSpacer: {
    width: 34,
    paddingLeft: 14,
    flexShrink: 0,
  },
  selectBox: {
    width: 34,
    paddingLeft: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevronCell: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 54,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(212,212,216,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CAMPUS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 12,
    color: CAMPUS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 340,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.28)',
  },
  emptyActionText: {
    color: CAMPUS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  skeletonWrap: { padding: 18, gap: 14 },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  skeletonBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  skeletonCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  skeletonText: {
    color: CAMPUS.textMuted,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    minHeight: 48,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.018)',
  },
  footerText: {
    fontFamily: CAMPUS.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: CAMPUS.textFaint,
    textTransform: 'uppercase',
  },
  footerNote: {
    flex: 1,
    minWidth: 100,
    textAlign: 'right',
    color: CAMPUS.textFaint,
    fontSize: 10.5,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(212,212,216,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,212,216,0.28)',
  },
  footerButtonPressed: { opacity: 0.7 },
  footerButtonText: {
    color: CAMPUS.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  footerButtonGhost: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CAMPUS.border,
  },
  footerButtonGhostText: {
    color: CAMPUS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});
