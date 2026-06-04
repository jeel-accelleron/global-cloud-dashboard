/**
 * Solar icon shim. Re-exports a set of components named after the previously
 * used `lucide-react` icons so existing call sites can switch to Solar icons
 * by changing only the import source.
 *
 * Each component accepts the lucide-style `size` and `className` props plus
 * `strokeWidth` (ignored — Solar icons are pre-stroked).
 */
import { Icon, type IconProps } from '@iconify/react';
import type { ComponentType, SVGAttributes } from 'react';

export interface IconBaseProps
  extends Omit<SVGAttributes<SVGElement>, 'children'> {
  size?: number | string;
  strokeWidth?: number;
}

export type LucideIcon = ComponentType<IconBaseProps>;

function make(name: string): LucideIcon {
  const Component = ({ size = 16, className, ...rest }: IconBaseProps) => {
    const { strokeWidth: _ignored, ...iconProps } = rest as IconBaseProps;
    return (
      <Icon
        icon={name}
        width={size}
        height={size}
        className={className}
        {...(iconProps as Partial<IconProps>)}
      />
    );
  };
  Component.displayName = name;
  return Component;
}

// ---------------------------------------------------------------------------
// Mapping: lucide-react export name  ->  Solar icon name
// ---------------------------------------------------------------------------

export const Activity = make('solar:pulse-linear');
export const AlertCircle = make('solar:danger-circle-linear');
export const AlertTriangle = make('solar:danger-triangle-linear');
export const ArrowLeft = make('solar:arrow-left-linear');
export const BarChart3 = make('solar:chart-2-linear');
export const Bell = make('solar:bell-linear');
export const Bug = make('solar:bug-linear');
export const CalendarClock = make('solar:calendar-linear');
export const CalendarRange = make('solar:calendar-mark-linear');
export const CalendarX = make('solar:calendar-minimalistic-linear');
export const CheckCircle2 = make('solar:check-circle-linear');
export const CheckSquare = make('solar:check-square-linear');
export const ChevronDown = make('solar:alt-arrow-down-linear');
export const ChevronLeft = make('solar:alt-arrow-left-linear');
export const ChevronRight = make('solar:alt-arrow-right-linear');
export const ChevronUp = make('solar:alt-arrow-up-linear');
export const ChevronsUpDown = make('solar:sort-vertical-linear');
export const CircleDashed = make('solar:record-circle-linear');
export const ClipboardList = make('solar:clipboard-list-linear');
export const Cloud = make('solar:cloud-linear');
export const ExternalLink = make('solar:arrow-right-up-linear');
export const FileQuestion = make('solar:question-circle-linear');
export const Filter = make('solar:filter-linear');
export const Flag = make('solar:flag-linear');
export const FolderKanban = make('solar:folder-with-files-linear');
export const Inbox = make('solar:inbox-linear');
export const Info = make('solar:info-circle-linear');
export const LayoutDashboard = make('solar:widget-linear');
export const ListChecks = make('solar:checklist-minimalistic-linear');
export const ListTodo = make('solar:list-check-linear');
export const Moon = make('solar:moon-linear');
export const PlayCircle = make('solar:play-circle-linear');
export const RefreshCw = make('solar:refresh-linear');
export const Search = make('solar:magnifer-linear');
export const Send = make('solar:plain-2-linear');
export const Sparkles = make('solar:magic-stick-3-linear');
export const Square = make('solar:stop-circle-linear');
export const Sun = make('solar:sun-linear');
export const Trash2 = make('solar:trash-bin-trash-linear');
export const TrendingUp = make('solar:graph-up-linear');
export const Trophy = make('solar:cup-star-linear');
export const User2 = make('solar:user-linear');
export const UserX = make('solar:user-cross-linear');
export const Users = make('solar:users-group-rounded-linear');
export const X = make('solar:close-circle-linear');
