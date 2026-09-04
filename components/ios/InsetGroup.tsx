import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, screenPadding, spacing } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

export interface InsetGroupProps {
  children: ReactNode;
  /** Left offset of the separator, to clear a leading thumbnail. */
  separatorInset?: number;
  /** Removes the horizontal screen gutter (for use inside a padded parent). */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * An iOS inset grouped container for content rows.
 *
 * This is the counterpart to `ListSection` for non-settings content: one
 * continuous surface holding several rows separated by hairlines, rather than
 * a stack of individually floating cards. Using it is what stops a list of
 * saved things from reading as a web dashboard.
 */
export function InsetGroup({
  children,
  separatorInset = 0,
  flush = false,
  style,
}: InsetGroupProps) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement[];

  if (rows.length === 0) return null;

  return (
    <View style={[flush ? undefined : styles.gutter, style]}>
      <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? (
              <View style={{ paddingLeft: separatorInset }}>
                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              </View>
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** Standard separator inset for a row with a leading thumbnail. */
export const thumbSeparatorInset = spacing.lg + 56 + spacing.md;

const styles = StyleSheet.create({
  gutter: {
    paddingHorizontal: screenPadding,
  },
  group: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
