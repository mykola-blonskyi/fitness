import type { ComponentType, SVGProps } from 'react';
import {
  AdminIcon,
  DiaryIcon,
  DietIcon,
  ExercisesIcon,
  FoodIcon,
  HomeIcon,
  PhotosIcon,
  SettingsIcon,
  TrainingIcon,
  WorkoutsIcon,
} from '@shared/ui/icons';

export type NavKey =
  | 'home'
  | 'diary'
  | 'photos'
  | 'training'
  | 'workouts'
  | 'exercises'
  | 'food'
  | 'diet'
  | 'settings'
  | 'admin';

export interface NavItem {
  key: NavKey;
  // Locale-relative path; '' is the home route.
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
}

export interface NavGroup {
  key: 'track' | 'plan' | 'account';
  items: NavItem[];
}

// Same sections as the old header nav (see ADR-007) grouped for the rail.
// Add an item here when a new section ships its first real page.
export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'track',
    items: [
      { key: 'home', path: '', icon: HomeIcon },
      { key: 'diary', path: '/diary', icon: DiaryIcon },
      { key: 'photos', path: '/photos', icon: PhotosIcon },
    ],
  },
  {
    key: 'plan',
    items: [
      { key: 'training', path: '/training', icon: TrainingIcon },
      { key: 'workouts', path: '/workouts', icon: WorkoutsIcon },
      { key: 'exercises', path: '/exercises', icon: ExercisesIcon },
      { key: 'food', path: '/food', icon: FoodIcon },
      { key: 'diet', path: '/diet', icon: DietIcon },
    ],
  },
  {
    key: 'account',
    items: [
      { key: 'settings', path: '/settings/profile', icon: SettingsIcon },
      {
        key: 'admin',
        path: '/admin/exercises',
        icon: AdminIcon,
        adminOnly: true,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

// Bottom tab bar (mobile) shows four sections; everything else lives
// behind "More".
export const MOBILE_TAB_KEYS: NavKey[] = ['home', 'diary', 'training', 'diet'];

// Which section a pathname belongs to; '/settings/preferences' -> settings.
export function activeNavKey(pathname: string): NavKey | undefined {
  const normalized = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  if (normalized === '/') return 'home';
  const match = NAV_ITEMS.filter((item) => item.path !== '').find((item) => {
    const section = '/' + item.path.split('/')[1];
    return normalized === section || normalized.startsWith(section + '/');
  });
  return match?.key;
}
