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
const createIcon = (Icon: LucideIcon, name: string) => {
  const Component = ({ size = 18, strokeWidth = 1.8, ...props }: IconProps) => (
    <Icon size={size} strokeWidth={strokeWidth} {...props} />
  );
  Component.displayName = `Icon${name}`;
  return Component;
};

// Factory for toggled icons that can switch between outlined and filled.
const createToggleIcon = (Icon: LucideIcon, name: string) => {
  const Component = ({
    filled = false,
    size = 16,
    strokeWidth = 1.8,
    ...props
  }: ToggleIconProps) => (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      fill={filled ? "currentColor" : "none"}
      {...props}
    />
  );
  Component.displayName = `Icon${name}`;
  return Component;
};

export const IconSearch = createIcon(Search, "Search");
export const IconArrowRight = createIcon(ArrowRight, "ArrowRight");
export const IconStop = createIcon(Square, "Stop");
export const IconPlus = createIcon(Plus, "Plus");
export const IconMessage = createIcon(MessageSquare, "Message");
export const IconCheck = createIcon(Check, "Check");
export const IconClose = createIcon(X, "Close");
export const IconMoon = createIcon(Moon, "Moon");
export const IconSun = createIcon(Sun, "Sun");
export const IconTrash = createIcon(Trash2, "Trash");
export const IconPencil = createIcon(Pencil, "Pencil");
export const IconDownload = createIcon(Download, "Download");
export const IconUpload = createIcon(Upload, "Upload");
export const IconChevronsLeft = createIcon(ChevronsLeft, "ChevronsLeft");
export const IconChevronsRight = createIcon(ChevronsRight, "ChevronsRight");
export const IconPin = createIcon(Pin, "Pin");
export const IconPinOff = createIcon(PinOff, "PinOff");
export const IconThumbUp = createToggleIcon(ThumbsUp, "ThumbUp");
export const IconThumbDown = createToggleIcon(ThumbsDown, "ThumbDown");
