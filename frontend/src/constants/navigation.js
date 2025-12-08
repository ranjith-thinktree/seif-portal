import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BellIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowUpTrayIcon,
  InboxIcon,
  AcademicCapIcon,
  FolderIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import { ROLES } from "./roles";
import { ROUTES } from "./routes";

/**
 * Sidebar navigation configuration
 * Each menu item has:
 * - name: Display name
 * - path: Route path
 * - icon: Heroicon component
 * - roles: Array of roles that can access this menu item
 */
export const SIDEBAR_MENU = [
  {
    name: "Home",
    path: ROUTES.DASHBOARD,
    icon: HomeIcon,
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PARTNER,
      ROLES.SEIF_READONLY,
      ROLES.ESSCI,
    ],
  },
  {
    name: "Inbox",
    path: ROUTES.INBOX,
    icon: InboxIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PARTNER],
  },
  {
    name: "Upload",
    path: ROUTES.UPLOAD_DATA,
    icon: ArrowUpTrayIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "Data",
    path: ROUTES.PARTNERS,
    icon: FolderIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ESSCI, ROLES.SEIF_READONLY],
  },
  {
    name: "Data",
    path: ROUTES.MY_CENTERS,
    icon: FolderIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "User Management",
    path: ROUTES.USERS,
    icon: UsersIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Reportings",
    path: ROUTES.REPORTS,
    icon: ChartBarIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SEIF_READONLY],
  },
  {
    name: "Profile",
    path: ROUTES.PROFILE,
    icon: UserCircleIcon,
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.PARTNER,
      ROLES.SEIF_READONLY,
      ROLES.ESSCI,
    ],
  },
  {
    name: "Settings",
    path: ROUTES.SETTINGS,
    icon: Cog6ToothIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Database Management",
    path: ROUTES.DATABASE_MANAGEMENT,
    icon: CircleStackIcon,
    roles: [ROLES.SUPER_ADMIN],
  },
  /* {
    name: "Partner Management",
    path: ROUTES.PARTNERS,
    icon: BuildingOfficeIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Center Management",
    path: ROUTES.CENTERS,
    icon: BuildingStorefrontIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Data Uploads",
    path: ROUTES.DATA_UPLOADS,
    icon: DocumentTextIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "Upload Data",
    path: ROUTES.UPLOAD_DATA,
    icon: DocumentTextIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "Requests",
    path: ROUTES.REQUESTS,
    icon: ClipboardDocumentListIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "My Requests",
    path: ROUTES.MY_REQUESTS,
    icon: ClipboardDocumentListIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "Analytics",
    path: ROUTES.ANALYTICS,
    icon: ChartBarIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.SEIF_READONLY],
  },
  {
    name: "Downloads",
    path: ROUTES.DOWNLOADS,
    icon: ArrowDownTrayIcon,
    roles: [ROLES.ESSCI],
  },*/
];

/**
 * Filter menu items based on user role
 * @param {string} userRole - User's role
 * @returns {Array} Filtered menu items
 */
export const getMenuItemsByRole = (userRole) => {
  return SIDEBAR_MENU.filter((item) => item.roles.includes(userRole));
};
