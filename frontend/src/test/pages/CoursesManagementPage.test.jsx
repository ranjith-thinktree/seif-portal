import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("../../components/layout/MainLayout", () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock("../../components/ui/dropdown-menu", () => {
  const DropdownContext = React.createContext(null);

  return {
    DropdownMenu: ({ children }) => {
      const [open, setOpen] = React.useState(false);
      return (
        <DropdownContext.Provider value={{ open, setOpen }}>
          <div>{children}</div>
        </DropdownContext.Provider>
      );
    },
    DropdownMenuTrigger: ({ children, asChild }) => {
      const context = React.useContext(DropdownContext);
      const handleClick = () => context.setOpen((value) => !value);

      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { onClick: handleClick });
      }

      return <button onClick={handleClick}>{children}</button>;
    },
    DropdownMenuContent: ({ children }) => {
      const context = React.useContext(DropdownContext);
      return context.open ? <div>{children}</div> : null;
    },
    DropdownMenuItem: ({ children, onClick }) => (
      <button onClick={onClick} type="button">
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  };
});

vi.mock("../../components/common/EnhancedDataTable", () => ({
  default: ({ columns, data, isLoading, onTableReady }) => {
    React.useEffect(() => {
      onTableReady?.({});
    }, [onTableReady]);

    return (
      <div data-testid="data-table">
        <div data-testid="table-headers">
          {columns.map((column) => (
            <span key={column.id || column.accessorKey}>
              {String(column.header)}
            </span>
          ))}
        </div>
        {isLoading && <div data-testid="loading">Loading...</div>}
        {data.map((row, index) => (
          <div key={row.id || index} data-testid={`row-${index}`}>
            {columns.map((column) => {
              if (column.id === "actions" && column.cell) {
                return (
                  <div key="actions" data-testid={`actions-${index}`}>
                    {column.cell({ row: { original: row } })}
                  </div>
                );
              }

              return null;
            })}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("../../components/common/AdvancedSearchBar", () => ({
  default: ({ actions = [] }) => (
    <div data-testid="search-bar">
      {actions.map((action) => (
        <button key={action.label} onClick={action.onClick} type="button">
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../services/data.service", () => ({
  getCoursesCatalog: vi.fn(),
  createCourseCatalog: vi.fn(),
  updateCourseCatalog: vi.fn(),
}));

import {
  createCourseCatalog,
  getCoursesCatalog,
  updateCourseCatalog,
} from "../../services/data.service";
import CoursesManagementPage from "../../pages/CoursesManagementPage";

const mockCourses = [
  {
    id: "course-1",
    course_name: "Basic Electrician",
    course_code: "ELEC-001",
    duration_months: 6,
    description: "Electrical training",
    is_active: true,
    centers_count: 2,
    packages_count: 1,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-02T10:00:00Z",
  },
];

describe("CoursesManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoursesCatalog.mockResolvedValue({ success: true, data: mockCourses });
    createCourseCatalog.mockResolvedValue({
      success: true,
      data: mockCourses[0],
    });
    updateCourseCatalog.mockResolvedValue({
      success: true,
      data: mockCourses[0],
    });
  });

  it("renders courses data and omits created/updated table headers", async () => {
    render(<CoursesManagementPage />);

    await waitFor(() => expect(getCoursesCatalog).toHaveBeenCalled());

    expect(screen.getByText("Courses Management")).toBeInTheDocument();
    const headers = screen.getByTestId("table-headers");
    expect(within(headers).getByText("Course")).toBeInTheDocument();
    expect(within(headers).queryByText("Created")).not.toBeInTheDocument();
    expect(within(headers).queryByText("Updated")).not.toBeInTheDocument();
  });

  it("opens add course dialog and creates a course", async () => {
    render(<CoursesManagementPage />);

    await waitFor(() => expect(getCoursesCatalog).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));

    fireEvent.change(screen.getByLabelText("Course Name"), {
      target: { value: "Solar Technician" },
    });
    fireEvent.change(screen.getByLabelText("Course Code"), {
      target: { value: "SOL-101" },
    });
    fireEvent.change(screen.getByLabelText("Duration (Months)"), {
      target: { value: "4" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() =>
      expect(createCourseCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          course_name: "Solar Technician",
          course_code: "SOL-101",
          duration_months: 4,
        }),
      ),
    );
  });

  it("opens actions menu and triggers deactivate flow", async () => {
    render(<CoursesManagementPage />);

    await waitFor(() => expect(getCoursesCatalog).toHaveBeenCalled());

    const actionCell = screen.getByTestId("actions-0");
    fireEvent.click(within(actionCell).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /confirm deactivate/i }),
    );

    await waitFor(() =>
      expect(updateCourseCatalog).toHaveBeenCalledWith("course-1", {
        is_active: false,
      }),
    );
  });
});
