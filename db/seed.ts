import { itemsRepo } from './repositories';
import type { NewItemInput } from '@/types/models';

/**
 * Development sample data.
 *
 * This is **never** called during normal app startup — it is wired only to an
 * explicit, clearly-labelled action in Settings (visible in `__DEV__` builds).
 * A shipped app starts completely empty.
 */

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

interface SeedItem extends NewItemInput {
  /** How long ago it was "tucked", in milliseconds. */
  ageMs: number;
}

const SAMPLES: readonly SeedItem[] = [
  {
    title: 'Hades II',
    url: 'https://store.steampowered.com/app/1145350/Hades_II/',
    categoryId: 'games',
    notes: 'Everyone says the early access is already better than the first one. Start on a weekend.',
    tags: ['roguelike', 'indie'],
    ageMs: 2 * HOUR,
  },
  {
    title: 'Ippudo Ramen — Kuromoto',
    url: 'https://www.ippudo.com/',
    categoryId: 'food',
    notes: 'Black garlic tonkotsu. Go before 6pm or the queue gets silly.',
    tags: ['ramen', 'dinner'],
    isFavorite: true,
    ageMs: 6 * HOUR,
  },
  {
    title: 'Piranesi — Susanna Clarke',
    url: 'https://bookshop.org/p/books/piranesi-susanna-clarke/14570270',
    categoryId: 'books',
    notes: 'Short. Strange. Apparently best read knowing nothing about it.',
    tags: ['fiction'],
    ageMs: DAY + 3 * HOUR,
  },
  {
    title: 'Naoshima art island',
    url: 'https://benesse-artsite.jp/en/',
    categoryId: 'places',
    description: 'Island in the Seto Inland Sea covered in museums and outdoor installations.',
    notes: 'Ferry from Uno port. The Chichu museum needs booking ahead.',
    tags: ['japan', 'someday'],
    isFavorite: true,
    ageMs: 2 * DAY,
  },
  {
    title: 'Roost laptop stand',
    url: 'https://www.therooststand.com/',
    categoryId: 'products',
    notes: 'Folds flat, actually portable. Wait for a sale.',
    ageMs: 3 * DAY,
  },
  {
    title: 'Low-tech Magazine — solar powered website',
    url: 'https://solar.lowtechmagazine.com/',
    categoryId: 'websites',
    description: 'A website that runs on solar power and goes offline when the battery runs out.',
    notes: 'Lovely dithered images. Good reference for a low-energy design approach.',
    tags: ['design', 'sustainability'],
    ageMs: 4 * DAY,
  },
  {
    title: 'The Bear — season 3',
    url: 'https://www.hulu.com/series/the-bear',
    categoryId: 'shows',
    notes: 'Watch the Copenhagen episode when I have a quiet evening.',
    ageMs: 5 * DAY,
  },
  {
    title: 'A better way to organise the kitchen shelves',
    categoryId: 'ideas',
    notes: 'Jars at eye level, everything daily within one reach, the rest can be awkward.',
    tags: ['home'],
    ageMs: 6 * DAY,
  },
  {
    title: 'Perfect Days',
    url: 'https://letterboxd.com/film/perfect-days-2023/',
    categoryId: 'movies',
    notes: 'Wim Wenders, Tokyo, a man who cleans toilets. Supposed to be quietly devastating.',
    tags: ['cinema'],
    ageMs: 8 * DAY,
  },
  {
    title: 'Kinfolk kitchen photography',
    url: 'https://www.are.na/',
    categoryId: 'inspiration',
    notes: 'Soft daylight, muted linens, lots of negative space.',
    tags: ['moodboard', 'design'],
    ageMs: 11 * DAY,
  },
  {
    title: 'How to do great work — Paul Graham',
    url: 'https://paulgraham.com/greatwork.html',
    categoryId: 'articles',
    notes: 'Long. Worth a proper sit-down rather than a skim.',
    tags: ['essay'],
    ageMs: 14 * DAY,
  },
  {
    title: 'Every Frame a Painting — the archive',
    url: 'https://www.youtube.com/@everyframeapainting',
    categoryId: 'videos',
    notes: 'Rewatch the Jackie Chan one.',
    ageMs: 18 * DAY,
  },
];

export interface SeedResult {
  created: number;
}

/**
 * Inserts the sample library. Reminders are set on a couple of items so the
 * "Coming Up" section and notification flow can be exercised.
 */
export async function seedDemoData(): Promise<SeedResult> {
  const now = Date.now();
  let created = 0;

  for (const [index, sample] of SAMPLES.entries()) {
    const { ageMs, ...input } = sample;

    // Three reminders covering the states the UI has to render: imminent,
    // a day out, and one already missed. Without the overdue case the
    // "Due" pill and the danger styling never appear in development.
    const reminderAt =
      index === 0
        ? now + 3 * HOUR
        : index === 1
          ? now + DAY + 2 * HOUR
          : index === 4
            ? now - 2 * DAY
            : null;

    const item = await itemsRepo.createItem({ ...input, reminderAt });

    // Backdate so "Recently tucked" and the sort options have a real spread.
    await itemsRepo.updateItem(item.id, {});
    await backdate(item.id, now - ageMs);
    created += 1;
  }

  // A couple of archived items so the Archive screen isn't empty in testing.
  const archived = await itemsRepo.createItem({
    title: 'Dune: Part Two',
    url: 'https://letterboxd.com/film/dune-part-two/',
    categoryId: 'movies',
    notes: 'Watched it. Worth the wait.',
  });
  await itemsRepo.setArchived(archived.id, true);
  await backdate(archived.id, now - 21 * DAY);
  created += 1;

  return { created };
}

/** Rewrites createdAt/updatedAt directly so the demo spread looks natural. */
async function backdate(itemId: string, timestamp: number): Promise<void> {
  const { getDatabase } = await import('./database');
  const db = await getDatabase();
  await db.runAsync('UPDATE items SET createdAt = ?, updatedAt = ? WHERE id = ?', [
    timestamp,
    timestamp,
    itemId,
  ]);
}
