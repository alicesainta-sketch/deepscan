import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowRight,
  Check,
  ChevronsLeft,
  ChevronsRight,
  Download,
  MessageSquare,
  Moon,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Square,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export type IconProps = Omit<LucideProps, "ref">;

type ToggleIconProps = IconProps & {
  // When true, use filled style to indicate selected state.
  filled?: boolean;
};

// Factory for standard line icons to keep size and stroke consistent.
const createIcon =
  (Icon: LucideIcon) =>
  ({ size = 18, strokeWidth = 1.8, ...props }: IconProps) => (
    <Icon size={size} strokeWidth={strokeWidth} {...props} />
  );

// Factory for toggled icons that can switch between outlined and filled.
const createToggleIcon =
  (Icon: LucideIcon) =>
  ({ filled = false, size = 16, strokeWidth = 1.8, ...props }: ToggleIconProps) => (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      fill={filled ? "currentColor" : "none"}
      {...props}
    />
  );

export const IconSearch = createIcon(Search);
export const IconArrowRight = createIcon(ArrowRight);
export const IconStop = createIcon(Square);
export const IconPlus = createIcon(Plus);
export const IconMessage = createIcon(MessageSquare);
export const IconCheck = createIcon(Check);
export const IconClose = createIcon(X);
export const IconMoon = createIcon(Moon);
export const IconSun = createIcon(Sun);
export const IconTrash = createIcon(Trash2);
export const IconPencil = createIcon(Pencil);
export const IconDownload = createIcon(Download);
export const IconUpload = createIcon(Upload);
export const IconChevronsLeft = createIcon(ChevronsLeft);
export const IconChevronsRight = createIcon(ChevronsRight);
export const IconPin = createIcon(Pin);
export const IconPinOff = createIcon(PinOff);
export const IconThumbUp = createToggleIcon(ThumbsUp);
export const IconThumbDown = createToggleIcon(ThumbsDown);
