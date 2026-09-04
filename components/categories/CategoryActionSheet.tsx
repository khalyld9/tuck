import { router } from 'expo-router';
import { memo, useCallback } from 'react';

import { OptionRow } from '@/components/ui/OptionRow';
import { Sheet } from '@/components/ui/Sheet';
import type { CategoryWithCount } from '@/types/models';

export interface CategoryActionSheetProps {
  /** The long-pressed category, or null when the sheet is closed. */
  category: CategoryWithCount | null;
  onClose: () => void;
}

/**
 * Quick actions for a category, raised by long-pressing its card.
 *
 * Everything here already existed as a destination — this is a shortcut to
 * them, not a new capability. It exists because the grid advertises a long
 * press, and an advertised gesture that does nothing is worse than no
 * gesture at all.
 */
export const CategoryActionSheet = memo(function CategoryActionSheet({
  category,
  onClose,
}: CategoryActionSheetProps) {
  // The sheet has to finish dismissing before the next screen slides up,
  // otherwise the two transitions fight each other.
  const navigate = useCallback(
    (go: () => void) => {
      onClose();
      setTimeout(go, 180);
    },
    [onClose]
  );

  const id = category?.id;
  const name = category?.name ?? '';

  return (
    <Sheet visible={category !== null} onClose={onClose} title={name}>
      <OptionRow
        label={`Open ${name}`}
        description="See everything in this pocket"
        icon="layout-grid"
        onPress={() => {
          if (id) navigate(() => router.push(`/category/${id}`));
        }}
      />
      <OptionRow
        label="Tuck something here"
        description="Opens the form with this category chosen"
        icon="plus"
        onPress={() => {
          if (id) navigate(() => router.push(`/add?categoryId=${id}`));
        }}
      />
      <OptionRow
        label="Browse all pockets"
        description="See every category at once"
        icon="layout-grid"
        onPress={() => navigate(() => router.push('/browse'))}
      />
    </Sheet>
  );
});
