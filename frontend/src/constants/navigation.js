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
  CommandLineIcon,
  WrenchScrewdriverIcon,
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
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PARTNER, ROLES.ESSCI],
  },
  {
    name: "Upload",
    path: ROUTES.UPLOAD_DATA,
    icon: ArrowUpTrayIcon,
    roles: [ROLES.PARTNER],
  },
  // {
  //   name: "Employment Upload",
  //   path: ROUTES.EMPLOYMENT_UPLOAD,
  //   icon: AcademicCapIcon,
  //   roles: [ROLES.PARTNER],
  // },
  // {
  //   name: "My Data",
  //   path: ROUTES.MY_DATA,
  //   icon: FolderIcon,
  //   roles: [ROLES.PARTNER],
  // },
  // {
  //   name: "My Requests",
  //   path: ROUTES.MY_REQUESTS,
  //   icon: WrenchScrewdriverIcon,
  //   roles: [ROLES.PARTNER],
  // },
  {
    name: "Certificates",
    path: ROUTES.PARTNER_CERTIFICATES,
    icon: AcademicCapIcon,
    roles: [ROLES.PARTNER],
  },
  {
    name: "User Management",
    path: ROUTES.USER_MANAGEMENT,
    icon: UsersIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Organization Management",
    path: ROUTES.ORGANIZATION_MANAGEMENT,
    icon: BuildingOfficeIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Data",
    path: ROUTES.DATA_MANAGEMENT,
    icon: FolderIcon,
    roles: [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.ESSCI,
      ROLES.SEIF_READONLY,
      ROLES.PARTNER,
    ],
  },
  {
    name: "ESSCI Data",
    path: ROUTES.ESSCI_DATA,
    icon: CircleStackIcon,
    roles: [ROLES.ESSCI],
  },
  {
    name: "Upload Certificates",
    path: ROUTES.ESSCI_UPLOAD,
    icon: ArrowUpTrayIcon,
    roles: [ROLES.ESSCI],
  },
  {
    name: "Refurbishment",
    path: ROUTES.REFURBISHMENT,
    icon: WrenchScrewdriverIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Employment",
    path: ROUTES.EMPLOYMENT_MANAGEMENT,
    icon: AcademicCapIcon,
    roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  },
  {
    name: "Analytics",
    path: ROUTES.ANALYTICS,
    icon: ChartBarIcon,
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
  {
    name: "Terminal",
    path: ROUTES.ADMIN_TERMINAL,
    icon: CommandLineIcon,
    roles: [ROLES.SUPER_ADMIN],
  },
];

/**
 * Filter menu items based on user role
 * @param {string} userRole - User's role
 * @returns {Array} Filtered menu items
 */
export const getMenuItemsByRole = (userRole) => {
  return SIDEBAR_MENU.filter((item) => item.roles.includes(userRole));
};
