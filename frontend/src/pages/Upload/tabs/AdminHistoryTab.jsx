/**
 * Admin Upload History Tab
 *
 * The Admin Upload History is a standalone full-page component with its own
 * routing (accessible at ROUTES.DATA_UPLOADS). Its implementation lives in
 * UploadHistoryPage.jsx and is registered in AppRoutes.jsx.
 *
 * This module re-exports it so it can be referenced from the tabs/ directory.
 * To use it as a standalone page (e.g. in a future tab), import from here:
 *   import AdminHistoryTab from "./tabs/AdminHistoryTab";
 */
export { default } from "../UploadHistoryPage";
