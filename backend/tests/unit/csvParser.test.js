const { validateRow } = require('../../src/utils/csvParser');

describe('csvParser.validateRow', () => {
  const availableCourses = [{ id: 1, course_name: 'Solar Technician', duration_months: 6 }];

  const buildRow = (overrides = {}) => ({
    data: {
      'Center ID': 'C001',
      'Batch Number': 'B001',
      'Batch Start Date': '01-01-2025',
      'Batch End Date': '30-06-2025',
      'Name of the Trainee': 'Ravi Kumar',
      DOB: '15-08-2001',
      'Father Name': 'Mohan Lal',
      Gender: 'Male',
      'Mobile Number': '9876543210',
      'Email ID': 'ravi@example.com',
      Qualification: '12th Pass',
      'Course Attended': 'Solar Technician',
      'Student Address': '123 Main Street',
      'Student City': 'Jaipur',
      'Student District': 'Jaipur',
      'Student State': 'Rajasthan',
      ...overrides,
    },
  });

  it('rejects empty mandatory cells with row and column details', () => {
    const row = buildRow({
      'Batch End Date': '',
      'Father Name': '',
      Qualification: '',
      'Student Address': '',
      'Student City': '',
      'Student District': '',
      'Student State': '',
    });

    const result = validateRow(row, 2, availableCourses);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Row 2, Column: Batch End Date — value is required',
        'Row 2, Column: Father Name — value is required',
        'Row 2, Column: Qualification — value is required',
        'Row 2, Column: Student Address — value is required',
        'Row 2, Column: Student City — value is required',
        'Row 2, Column: Student District — value is required',
        'Row 2, Column: Student State — value is required',
      ])
    );
  });

  it('reports wrong data with exact cell context', () => {
    const row = buildRow({
      DOB: '2001/08/15',
      Gender: 'Unknown',
      'Mobile Number': '12345',
      'Course Attended': 'Solar Techzzz',
    });

    const result = validateRow(row, 7, availableCourses);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Row 7, Column: DOB — must be in DD-MM-YYYY format',
        'Row 7, Column: Gender — must be one of: Male, Female, Other',
        'Row 7, Column: Mobile Number — must be at least 10 digits (found 5)',
      ])
    );
    expect(
      result.errors.some((error) => error.startsWith('Row 7, Column: Course Attended —'))
    ).toBe(true);
  });

  it('accepts a fully valid row', () => {
    const row = buildRow();

    const result = validateRow(row, 3, availableCourses);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.row.matchedCourseName).toBe('Solar Technician');
    expect(result.row.matchedCourseDuration).toBe(6);
  });
});
