# SEIF Portal - E2E Testing with Playwright

## 📋 Overview

Comprehensive end-to-end testing suite for SEIF Portal using Playwright Test framework.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. Run All Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/data-overview.spec.js

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 3. View Test Reports

```bash
# Generate and open HTML report
npx playwright show-report

# View test results
cat test-results.json
```

## 📁 Test Structure

```
tests/
├── e2e/
│   ├── data-overview.spec.js    # Partner & Center Breakdown tests
│   └── [future tests]
├── helpers/
│   ├── auth.helper.js           # Authentication utilities
│   └── data.helper.js           # Data table utilities
├── .env.test                    # Test environment variables
└── README.md                    # This file
```

## 🧪 Test Coverage

### Data Overview Tab Tests (30+ tests)

#### Partner-wise Breakdown

- ✅ Table rendering and structure
- ✅ Top 10 partners display
- ✅ Partner names from JSON (database-matched)
- ✅ Year filter functionality (all, 2022-23, 2023-24, 2024-25)
- ✅ Data aggregation (sum of 3 years for "all")
- ✅ Gender display (0 for historical data)
- ✅ Descending sort by total students

#### Center-wise Breakdown

- ✅ Table rendering and structure
- ✅ Top 20 centers display
- ✅ Center names from JSON
- ✅ Partner names from partnerName field
- ✅ Location format ("City, State")
- ✅ Year filter functionality
- ✅ Data aggregation (sum of 3 years for "all")
- ✅ Descending sort by total students

#### Cross-filter Tests

- ✅ Synchronized filter updates
- ✅ Data consistency across views

#### Error Monitoring

- ✅ No critical console errors

## 🔧 Configuration

### Environment Variables

Edit `tests/e2e/.env.test`:

```env
VITE_APP_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5000
TEST_USER_EMAIL=demo.partner@seif.org
TEST_USER_PASSWORD=Password123
```

### Playwright Config

Edit `playwright.config.js` for:

- Test timeout settings
- Browser configurations
- Parallel execution
- Report formats
- Screenshot/video settings

## 📊 Test Scenarios

### Scenario 1: Verify Partner Breakdown Displays Data

1. Login with demo credentials
2. Navigate to Data → Overview
3. Verify Partner-wise Breakdown table exists
4. Check data displays (Top 10 partners)
5. Verify sorting (descending by students)

### Scenario 2: Test Year Filter Functionality

1. Login and navigate to Overview
2. Check default "all" year filter
3. Change to 2022-23, verify data updates
4. Change to 2023-24, verify data updates
5. Change to 2024-25, verify data updates
6. Verify "all" sums all 3 years

### Scenario 3: Verify Center Breakdown Displays Data

1. Login and navigate to Overview
2. Verify Center-wise Breakdown table exists
3. Check data displays (Top 20 centers)
4. Verify partner names from JSON
5. Verify location format ("City, State")

### Scenario 4: Cross-filter Synchronization

1. Login and navigate to Overview
2. Change year filter
3. Verify both breakdowns update
4. Check data consistency

## 🐛 Debugging

### Run with Debug Mode

```bash
# Run with Playwright Inspector
npx playwright test --debug

# Run specific test with debug
npx playwright test tests/e2e/data-overview.spec.js:10 --debug
```

### View Screenshots and Videos

After test failures:

- Screenshots: `test-results/[test-name]/screenshot.png`
- Videos: `test-results/[test-name]/video.webm`
- Traces: Open with `npx playwright show-trace trace.zip`

### Common Issues

**Issue: Tests timeout**

- Solution: Increase timeout in `playwright.config.js`
- Check if dev server is running

**Issue: Login fails**

- Solution: Verify demo_data.sql has been imported
- Check credentials in `.env.test`

**Issue: Selectors not found**

- Solution: Run with `--headed` to see actual UI
- Update selectors in test files

## 📈 Continuous Integration

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

See `.github/workflows/playwright.yml` for CI configuration.

## 🎯 Best Practices

1. **Use Helper Functions**: Reuse auth and data helpers
2. **Wait for Elements**: Use `waitForSelector` instead of `waitForTimeout`
3. **Descriptive Test Names**: Clear, action-oriented test descriptions
4. **Independent Tests**: Each test should be runnable independently
5. **Clean State**: Use `beforeEach` to reset state
6. **Assertions**: Use Playwright's built-in `expect` assertions
7. **Error Messages**: Include context in custom error messages

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen) - `npx playwright codegen`

## 🤝 Contributing

When adding new tests:

1. Follow existing test structure
2. Add tests to appropriate spec file
3. Update this README with new test coverage
4. Ensure all tests pass before committing
5. Add helpers for reusable functionality

## 📝 Test Checklist

Before releasing:

- [ ] All E2E tests pass
- [ ] No console errors in tests
- [ ] Screenshots/videos reviewed for failures
- [ ] Test coverage documented
- [ ] CI pipeline successful

---

**Last Updated**: January 27, 2026  
**Maintained By**: SEIF Development Team
