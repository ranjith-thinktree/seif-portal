import React from "react";
import StudentsPage from "../StudentsPage";

/**
 * Student List Tab for Data Management
 * Reuses existing StudentsPage component with multi-select filters
 */
const StudentListTab = () => {
  return <StudentsPage embedded={true} />;
};

export default StudentListTab;
