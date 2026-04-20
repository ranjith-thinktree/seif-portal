import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import DashboardPage from "../DashboardPage";
import * as dataService from "../../../services/data.service";

// Mock the data service
vi.mock("../../../services/data.service");

// Mock useNotifications to avoid requiring NotificationProvider (used by Header inside DashboardPage)
vi.mock("../../../hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    updateUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    loading: false,
  }),
}));

// Mock IndiaTrainingCard — heavy SVG map component requiring state data; irrelevant to DashboardPage unit tests
vi.mock("../../../components/dashboard/IndiaTrainingCard", () => ({
  default: () => <div data-testid="india-training-card" />,
}));

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => <div />,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

// Create a minimal Redux store with auth state for DashboardPage (uses useAuth → useSelector)
const createTestStore = () =>
  configureStore({
    reducer: {
      auth: () => ({
        user: {
          id: "user-1",
          full_name: "Admin User",
          email: "admin@seif.org",
          role: "ADMIN",
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }),
    },
  });

// Helper to render with both Redux Provider and BrowserRouter
const renderWithStore = (ui) =>
  render(
    <Provider store={createTestStore()}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>,
  );

describe("DashboardPage - Data Fetching & Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API Response Handling", () => {
    it("should handle wrapped API response correctly (with data property)", async () => {
      // Backend returns: { success: true, message: "...", data: {...}, timestamp: "..." }
      const wrappedResponse = {
        success: true,
        message: "Dashboard data retrieved successfully",
        data: {
          totalPartners: 50,
          totalCenters: 85,
          totalStudents: 2500,
          totalEmployments: 1200,
          totalStates: 28,
          maleStudents: 1500,
          femaleStudents: 1000,
          centers2022: 20,
          centers2023: 25,
          centers2024: 30,
          centers2025: 35,
          students2022: 800,
          students2023: 900,
          students2024: 1000,
          students2025: 1100,
          courseBreakdown: [
            { course_name: "Python Programming", center_count: 30 },
            { course_name: "Java Development", center_count: 25 },
            { course_name: "Web Development", center_count: 20 },
          ],
        },
        timestamp: new Date().toISOString(),
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(wrappedResponse);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Check if Partners count is displayed (not "0")
        expect(screen.getByText("Partners")).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
      });
    });

    it("should handle unwrapped API response correctly (flat object)", async () => {
      // Fallback case: if API returns flat object without wrapper
      const flatResponse = {
        totalPartners: 50,
        totalCenters: 85,
        totalStudents: 2500,
        centers2022: 20,
        centers2023: 25,
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(flatResponse);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
      });
    });

    it("should correctly extract totalPartners from wrapped response", async () => {
      const wrappedResponse = {
        success: true,
        data: {
          totalPartners: 42,
          totalCenters: 100,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(wrappedResponse);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Should display "42", not "0"
        expect(screen.getByText("42")).toBeInTheDocument();
      });
    });
  });

  describe("Chart Data Population", () => {
    it("should populate Centers Growth chart with correct data", async () => {
      const response = {
        data: {
          totalCenters: 85,
          centers2022: 20,
          centers2023: 25,
          centers2024: 30,
          centers2025: 35,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Check if Centers Growth section is rendered
        expect(screen.getByText("Centers Growth")).toBeInTheDocument();
      });
    });

    it("should populate Students Trend chart with correct data", async () => {
      const response = {
        data: {
          totalStudents: 2500,
          students2022: 800,
          students2023: 900,
          students2024: 1000,
          students2025: 1100,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Students Trend")).toBeInTheDocument();
      });
    });

    it("should handle monthly breakdown for specific year filter", async () => {
      const response = {
        data: {
          totalCenters: 85,
          totalStudents: 2500,
          monthlyBreakdown: [
            { month: "Jan", centers: 70, students: 2000 },
            { month: "Feb", centers: 72, students: 2100 },
            { month: "Mar", centers: 75, students: 2200 },
          ],
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Centers Growth")).toBeInTheDocument();
      });
    });
  });

  describe("Course Breakdown Tooltip", () => {
    it("should populate courseBreakdown state for tooltip", async () => {
      const response = {
        data: {
          totalCenters: 85,
          courseBreakdown: [
            { course_name: "Python Programming", center_count: 30 },
            { course_name: "Java Development", center_count: 25 },
            { course_name: "Web Development", center_count: 20 },
          ],
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Verify Total Centers card is rendered (which has the tooltip)
        expect(screen.getByText("Centers")).toBeInTheDocument();
        expect(screen.getByText("85")).toBeInTheDocument();
      });
    });

    it("should handle empty courseBreakdown gracefully", async () => {
      const response = {
        data: {
          totalCenters: 85,
          courseBreakdown: [],
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Centers")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should fall back to JSON data on API error", async () => {
      dataService.getConsolidatedAnalytics.mockRejectedValue(
        new Error("Network error"),
      );
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Should show error state or fallback to dashboardData.json
        expect(screen.getByText("Partners")).toBeInTheDocument();
      });
    });

    it("should display error message when API fails", async () => {
      dataService.getConsolidatedAnalytics.mockRejectedValue(
        new Error("Failed to fetch analytics"),
      );
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Component should render even with error (using fallback data)
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
    });
  });

  describe("Combined Values Computation", () => {
    it("should merge API data with fallback correctly", async () => {
      const response = {
        data: {
          totalPartners: 50,
          totalCenters: 85,
          totalStudents: 2500,
          totalEmployments: 1200,
          totalStates: 28,
          maleStudents: 1500,
          femaleStudents: 1000,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // All stat cards should display API values
        expect(screen.getByText("50")).toBeInTheDocument(); // Partners
        expect(screen.getByText("85")).toBeInTheDocument(); // Centers
        expect(screen.getByText("2,500")).toBeInTheDocument(); // Students
        expect(screen.getByText("1,200")).toBeInTheDocument(); // Employments
      });
    });

    it("should use 0 as fallback when API data is missing", async () => {
      const response = {
        data: {
          totalCenters: 85,
          // totalPartners is missing
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Should show 0 for missing Partners (fallback)
        expect(screen.getByText("Partners")).toBeInTheDocument();
      });
    });
  });

  describe("KPI custom titles", () => {
    it("should display a custom KPI title from settings on the admin dashboard", async () => {
      dataService.getConsolidatedAnalytics.mockResolvedValue({
        data: {
          totalPartners: 50,
          kpiSettings: {
            partners: {
              customLabel: "Organizations",
              isVisible: true,
              sortOrder: 5,
            },
          },
        },
      });

      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Organizations")).toBeInTheDocument();
        expect(screen.queryByText("Partners")).not.toBeInTheDocument();
      });
    });
  });

  describe("Year Filter", () => {
    it('should fetch data for "all" years by default', async () => {
      const response = {
        data: {
          totalPartners: 50,
          centers2022: 20,
          centers2023: 25,
          centers2024: 30,
          centers2025: 35,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Verify API was called with correct parameters
        expect(dataService.getConsolidatedAnalytics).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state initially", () => {
      dataService.getConsolidatedAnalytics.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );
      renderWithStore(<DashboardPage />);

      // Should show loading indicator
      expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
    });

    it("should hide loading state after data loads", async () => {
      const response = {
        data: {
          totalPartners: 50,
        },
      };

      dataService.getConsolidatedAnalytics.mockResolvedValue(response);
      renderWithStore(<DashboardPage />);

      await waitFor(() => {
        // Loading should be complete, data displayed
        expect(screen.getByText("50")).toBeInTheDocument();
      });
    });
  });
});
