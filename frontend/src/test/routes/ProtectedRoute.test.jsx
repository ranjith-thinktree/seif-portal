import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../components/common", () => ({
  PageLoader: () => <div>Loading...</div>,
}));

import { useAuth } from "../../hooks";
import ProtectedRoute from "../../routes/ProtectedRoute";
import { ROUTES } from "../../constants/routes";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when the current role is allowed", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "ADMIN",
    });

    render(
      <MemoryRouter initialEntries={[ROUTES.COURSES_MANAGEMENT]}>
        <Routes>
          <Route
            path={ROUTES.COURSES_MANAGEMENT}
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                <div>Courses page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Courses page")).toBeInTheDocument();
  });

  it("redirects to dashboard when the current role is not allowed", () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      role: "PARTNER",
    });

    render(
      <MemoryRouter initialEntries={[ROUTES.COURSES_MANAGEMENT]}>
        <Routes>
          <Route
            path={ROUTES.COURSES_MANAGEMENT}
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                <div>Courses page</div>
              </ProtectedRoute>
            }
          />
          <Route path={ROUTES.DASHBOARD} element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Courses page")).not.toBeInTheDocument();
  });
});
