import {
  Children,
  Fragment,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { Symbol, type SymbolName } from '@/components/ui/Symbol';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { radius, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

/**
 * iOS grouped-list primitives.
 *
 * The rule this file encodes: a section is *not* a card. Apple's grouped
 * lists read as a continuous inset surface with hairline separators between
 * rows — no outline, no shadow, no per-row container. Hierarchy comes from
 * the uppercase section header, the inset, and the separators, which is why
 * the result reads as a system list rather than a stack of web cards.
 *
 * Separators inset to align with the row's *text*, not its edge, exactly as
 * UITableView does when a row has a leading icon.
 */

const ROW_MIN_HEIGHT = 44;
const ICON_SLOT = 29;
const ICON_GAP = spacing.md;

// ─── Section ────────────────────────────────────────────────────────────────

export interface ListSectionProps {
  /** Uppercase header above the group. Omit for an unlabelled group. */
  title?: string;
  /** Explanatory text below the group, in Apple's footnote slot. */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ListSection({ title, footer, children, style }: ListSectionProps) {
  const theme = useTheme();

  // Separators are drawn *between* rows only — never above the first or below
  // the last, which is what distinguishes a grouped list from a bordered box.
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement[];

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <Text variant="footnote" color="subtle" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </Text>
      ) : null}

      <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <Separator /> : null}
            {row}
          </Fragment>
        ))}
      </View>

      {footer ? (
        <Text variant="footnote" color="subtle" style={styles.sectionFooter}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Hairline between rows, inset to the text column so it starts where the
 * label starts rather than cutting the icon off.
 */
function Separator() {
  const theme = useTheme();
  return (
    <View style={styles.separatorTrack}>
      <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

export interface ListRowProps {
  /** Leading SF Symbol. Rows without one align their text to the same column. */
  symbol?: SymbolName;
  /**
   * Set false on an iconless row inside an otherwise iconless group, so its
   * text starts at the group's edge instead of the (empty) icon column.
   */
  reserveSymbolSlot?: boolean;
  /** Tint behind the symbol. Defaults to the accent, Apple-style. */
  symbolTint?: string;
  label: string;
  /** Secondary line under the label. Use sparingly — most rows don't need one. */
  description?: string;
  /** Right-aligned value, e.g. "Light" or a version number. */
  value?: string;
  /** Shows the disclosure chevron. Implied by `onPress` unless set false. */
  chevron?: boolean;
  onPress?: () => void;
  /** Renders the label in the destructive colour. */
  destructive?: boolean;
  /** Swaps the accessory for a spinner. */
  loading?: boolean;
  disabled?: boolean;
  /** Arbitrary trailing content (a Toggle, a badge). Wins over `value`. */
  accessory?: ReactNode;
  accessibilityHint?: string;
}

export const ListRow = memo(function ListRow({
  symbol,
  reserveSymbolSlot,
  symbolTint,
  label,
  description,
  value,
  chevron,
  onPress,
  destructive,
  loading,
  disabled,
  accessory,
  accessibilityHint,
}: ListRowProps) {
  const theme = useTheme();

  const showChevron = chevron ?? Boolean(onPress);
  const tint = destructive ? theme.colors.danger : theme.colors.text;

  const content = (
    <View style={styles.row}>
      {symbol ? (
        <View style={styles.iconSlot}>
          <Symbol
            name={symbol}
            size={21}
            color={destructive ? theme.colors.danger : (symbolTint ?? theme.colors.accent)}
          />
        </View>
      ) : reserveSymbolSlot ? (
        // Keeps an iconless row's label on the same column as its
        // neighbours', the way Apple aligns a bare "Version" row.
        <View style={styles.iconSlot} />
      ) : null}

      <View style={styles.rowBody}>
        <Text variant="body" style={{ color: tint }} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="footnote" color="subtle" numberOfLines={2} style={styles.rowDescription}>
            {description}
          </Text>
        ) : null}
      </View>

      <View style={styles.rowTrailing}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textSubtle} />
        ) : (
          <>
            {accessory ??
              (value ? (
                <Text variant="body" color="subtle" numberOfLines={1} style={styles.rowValue}>
                  {value}
                </Text>
              ) : null)}
            {showChevron ? (
              <Symbol
                name="chevronRight"
                size={14}
                weight="semibold"
                color={theme.colors.textSubtle}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={styles.rowHost}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      // A grouped row highlights its whole width on press, like UITableView's
      // selection state — no scale, no ripple, no rounded inner card.
      pressScale={1}
      pressedBackgroundColor={theme.colors.surfacePressed}
      style={styles.rowHost}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {content}
    </Pressable>
  );
});

// ─── Toggle row ─────────────────────────────────────────────────────────────

export interface ListToggleRowProps {
  symbol?: SymbolName;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityHint?: string;
}

/**
 * A row whose accessory is a switch. Tapping the *row* does nothing — on iOS
 * only the switch itself is interactive, and mimicking that avoids the
 * "everything is a button" feel of web settings pages.
 */
export const ListToggleRow = memo(function ListToggleRow({
  symbol,
  label,
  description,
  value,
  onValueChange,
  disabled,
  accessibilityHint,
}: ListToggleRowProps) {
  return (
    <ListRow
      symbol={symbol}
      label={label}
      description={description}
      chevron={false}
      accessory={
        <Toggle
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
        />
      }
    />
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    // Apple sets grouped headers in uppercase footnote, padded to align with
    // the group's inset and given room to breathe above.
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  sectionFooter: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    lineHeight: 17,
  },
  group: {
    // Continuous inset surface. No border, no shadow — the fill alone
    // separates it from the grouped background.
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  rowHost: {
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconSlot: {
    width: ICON_SLOT,
    marginRight: ICON_GAP,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    justifyContent: 'center',
  },
  rowDescription: {
    marginTop: 1,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.md,
    maxWidth: '52%',
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  separatorTrack: {
    // The separator starts at the text column, so a row with an icon shows a
    // shorter rule — the detail that makes a list read as UITableView.
    paddingLeft: spacing.lg + ICON_SLOT + ICON_GAP,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
