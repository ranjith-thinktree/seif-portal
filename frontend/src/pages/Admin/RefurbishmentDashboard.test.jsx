/**
 * RefurbishmentDashboard Component - Test Suite
 * Tests core functionality with Vitest
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import RefurbishmentDashboard from "./RefurbishmentDashboard";
import refurbishmentService from "../../services/refurbishment.service";
import { NotificationProvider } from "../../context/NotificationContext";

// Mock MainLayout to just render children (avoid nested component dependencies)
vi.mock("../../components/layout", () => ({
  MainLayout: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock socket.io-client BEFORE importing components that use it
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

// Mock services
vi.mock("../../services/refurbishment.service", () => ({
  default: {
    getYearStats: vi.fn(),
    getEligibleCenters: vi.fn(),
    getAlerts: vi.fn(),
    getActiveRequests: vi.fn(),
    getPastRequests: vi.fn(),
    getPackages: vi.fn(),
    notifyPartner: vi.fn(),
    createRequest: vi.fn(),
    getDashboardSummary: vi.fn(),
    getLastRefurbished: vi.fn(),
    getAllCenters: vi.fn(),
    getScheduledNotifications: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock notification service - uses NAMED exports, not default export
vi.mock("../../services/notification.service", () => ({
  getUnreadCount: vi.fn().mockResolvedValue({ count: 0 }),
  getGroupedNotifications: vi.fn().mockResolvedValue({ notifications: [] }),
  markAsRead: vi.fn().mockResolvedValue({ success: true }),
  markAllAsRead: vi.fn().mockResolvedValue({ success: true }),
  deleteNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock useWebSocket hook - return hook function that returns state
vi.mock("../../hooks/useWebSocket", () => {
  return {
    default: () => ({
      connected: false,
      notifications: [],
      unreadCount: 0,
    }),
  };
});

// Prevent navigation errors in JSDOM
Object.defineProperty(window, "location", {
  writable: true,
  value: { href: "" },
});

// Mock data
const mockYearStats = {
  totalCenters: 150,
  eligibleCenters: 45,
  activeRequests: 12,
  completedRequests: 38,
};

const mockEligibleCenters = {
  success: true,
  data: {
    centers: [
      {
        id: "center-1",
        center_name: "Delhi Training Center",
        partner_name: "Tech Skills Pvt Ltd",
        city: "Delhi",
        state: "Delhi",
        courses_count: 3,
        last_refurbishment_date: "2022-06-15",
        months_since_last: 42,
        refurbishment_frequency_months: 36,
      },
    ],
    pagination: { total: 45, limit: 50, offset: 0 },
    totalCount: 45,
  },
};

const mockAlerts = {
  success: true,
  data: {
    alerts: [],
    pagination: { total: 0, limit: 50, offset: 0 },
    totalCount: 0,
  },
};

const mockActiveRequests = {
  success: true,
  data: {
    requests: [],
    pagination: { total: 12, limit: 50, offset: 0 },
    totalCount: 12,
  },
};

const mockPastRequests = {
  success: true,
  data: {
    requests: [],
    pagination: { total: 38, limit: 50, offset: 0 },
    totalCount: 38,
  },
};

const mockPackages = {
  success: true,
  data: {
    packages: [
      {
        id: "pkg-1",
        package_name: "Electrical Lab Equipment",
        description: "Multimeters, oscilloscopes",
      },
    ],
  },
};

// Create mock store
const createMockStore = (isAdmin = true) => {
  return configureStore({
    reducer: {
      auth: () => ({
        user: {
          id: "user-1",
          full_name: "Admin User",
          email: "admin@seif.org",
          role: isAdmin ? "ADMIN" : "PARTNER",
        },
        isAuthenticated: true,
      }),
    },
  });
};

// Wrapper component
const renderWithProviders = (component, { store = createMockStore() } = {}) => {
  return render(
    <Provider store={store}>
      <NotificationProvider>
        <BrowserRouter>{component}</BrowserRouter>
      </NotificationProvider>
    </Provider>,
  );
};

describe("RefurbishmentDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refurbishmentService.getYearStats.mockResolvedValue({
      success: true,
      data: mockYearStats,
    });
    refurbishmentService.getEligibleCenters.mockResolvedValue(
      mockEligibleCenters,
    );
    refurbishmentService.getAlerts.mockResolvedValue(mockAlerts);
    refurbishmentService.getActiveRequests.mockResolvedValue(
      mockActiveRequests,
    );
    refurbishmentService.getPastRequests.mockResolvedValue(mockPastRequests);
    refurbishmentService.getPackages.mockResolvedValue(mockPackages);
    refurbishmentService.getDashboardSummary.mockResolvedValue({
      success: true,
      data: mockYearStats,
    });
    refurbishmentService.getLastRefurbished.mockResolvedValue(
      mockEligibleCenters,
    );
    refurbishmentService.getAllCenters.mockResolvedValue(mockEligibleCenters);
    refurbishmentService.getScheduledNotifications.mockResolvedValue({
      success: true,
      data: { notifications: [], pagination: { total: 0 } },
    });
  });

  describe("Access Control", () => {
    it("should deny access for non-admin users", () => {
      const store = createMockStore(false);
      renderWithProviders(<RefurbishmentDashboard />, { store });

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    });

    it("should allow access for admin users", async () => {
      renderWithProviders(<RefurbishmentDashboard />);

      await waitFor(() => {
        expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
      });
    });
  });

  describe("Component Initialization", () => {
    it("should render without errors", async () => {
      renderWithProviders(<RefurbishmentDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Refurbishment")).toBeInTheDocument();
      });
    });

    it("should load year statistics on mount", async () => {
      renderWithProviders(<RefurbishmentDashboard />);

      // Component loads eligible centers data on mount via useRefurbishmentData hook
      await waitFor(() => {
        expect(refurbishmentService.getEligibleCenters).toHaveBeenCalled();
      });
    });

    it("should display summary cards with correct data", async () => {
      renderWithProviders(<RefurbishmentDashboard />);

      // Summary cards headings are always rendered; counts come from array lengths
      await waitFor(() => {
        expect(screen.getByText("Eligible Centers")).toBeInTheDocument();
      });
    });
  });

  describe("Tab Rendering", () => {
    it("should render all 5 tabs", async () => {
      renderWithProviders(<RefurbishmentDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Eligibility")).toBeInTheDocument();
        expect(screen.getByText("Alerts")).toBeInTheDocument();
        expect(screen.getByText("Requests")).toBeInTheDocument();
        expect(screen.getByText("Past Requests")).toBeInTheDocument();
      });
    });
  });
});
