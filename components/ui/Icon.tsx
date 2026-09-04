import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowUpDown,
  Bell,
  BellOff,
  BellRing,
  Bookmark,
  BookOpen,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Clock,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  FileDown,
  FileUp,
  Gamepad2,
  Globe,
  Grid2x2,
  Hash,
  Heart,
  House,
  Image as ImageIcon,
  Info,
  LayoutGrid,
  Lightbulb,
  Link,
  List,
  Loader,
  Lock,
  MapPin,
  Moon,
  Newspaper,
  Palette,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Shuffle,
  Sparkles,
  SquareArrowOutUpRight,
  Star,
  Sun,
  SunMoon,
  Tag,
  Trash2,
  Tv,
  Upload,
  Utensils,
  Vibrate,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { memo } from 'react';

import { useTheme } from '@/hooks/useTheme';

/**
 * Central icon registry.
 *
 * Importing icons by name in one place keeps bundle size predictable and lets
 * category records store a plain string ("clapperboard") in SQLite.
 */
const ICONS = {
  archive: Archive,
  'archive-restore': ArchiveRestore,
  'arrow-left': ArrowLeft,
  'arrow-up-down': ArrowUpDown,
  bell: Bell,
  'bell-off': BellOff,
  'bell-ring': BellRing,
  bookmark: Bookmark,
  'book-open': BookOpen,
  calendar: Calendar,
  check: Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'circle-alert': CircleAlert,
  clapperboard: Clapperboard,
  clock: Clock,
  download: Download,
  ellipsis: Ellipsis,
  'external-link': ExternalLink,
  eye: Eye,
  'file-down': FileDown,
  'file-up': FileUp,
  'gamepad-2': Gamepad2,
  globe: Globe,
  'grid-2x2': Grid2x2,
  hash: Hash,
  heart: Heart,
  house: House,
  image: ImageIcon,
  info: Info,
  'layout-grid': LayoutGrid,
  lightbulb: Lightbulb,
  link: Link,
  list: List,
  loader: Loader,
  lock: Lock,
  'map-pin': MapPin,
  moon: Moon,
  newspaper: Newspaper,
  palette: Palette,
  'party-popper': PartyPopper,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  search: Search,
  settings: Settings,
  'share-2': Share2,
  'shopping-bag': ShoppingBag,
  shuffle: Shuffle,
  sparkles: Sparkles,
  'square-arrow-out-up-right': SquareArrowOutUpRight,
  star: Star,
  sun: Sun,
  'sun-moon': SunMoon,
  tag: Tag,
  'trash-2': Trash2,
  tv: Tv,
  upload: Upload,
  utensils: Utensils,
  vibrate: Vibrate,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(value: string): value is IconName {
  return value in ICONS;
}

export interface IconProps {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export const Icon = memo(function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.9,
  fill = 'none',
}: IconProps) {
  const theme = useTheme();
  const Component = (isIconName(name) ? ICONS[name] : ICONS.bookmark) as LucideIcon;

  return (
    <Component
      size={size}
      color={color ?? theme.colors.text}
      strokeWidth={strokeWidth}
      fill={fill}
    />
  );
});
