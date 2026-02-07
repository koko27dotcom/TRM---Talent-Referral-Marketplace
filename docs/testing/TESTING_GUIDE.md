# TRM Referral Platform Testing Guide

Comprehensive testing documentation for the TRM Referral Platform.

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Backend Testing](#backend-testing)
4. [Frontend Testing](#frontend-testing)
5. [E2E Testing](#e2e-testing)
6. [Running Tests](#running-tests)
7. [Writing Tests](#writing-tests)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

The TRM Referral Platform uses a comprehensive testing strategy with three levels:

- **Unit Tests**: Test individual functions, components, and modules in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **E2E Tests**: Test complete user flows across the application

### Test Coverage Goals

- **Backend**: 80%+ code coverage
- **Frontend**: 80%+ code coverage
- **Critical Paths**: 100% coverage

## Test Architecture

### Directory Structure

```
├── tests/
│   ├── unit/              # Unit tests
│   │   ├── models/        # Model tests
│   │   ├── services/      # Service tests
│   │   ├── middleware/    # Middleware tests
│   │   └── utils/         # Utility tests
│   ├── integration/       # Integration tests
│   │   └── routes/        # API route tests
│   ├── factories/         # Test data factories
│   ├── mocks/             # Mock implementations
│   ├── fixtures/          # Test fixtures
│   ├── setup/             # Test setup files
│   └── utils/             # Test utilities
├── src/
│   └── test/              # Frontend test utilities
│       ├── mocks/         # MSW handlers
│       └── utils/         # Test helpers
├── e2e/                   # E2E tests
│   ├── auth.spec.ts
│   ├── referral-flow.spec.ts
│   └── utils/
└── docs/testing/          # Testing documentation
```

## Backend Testing

### Jest Configuration

The backend uses Jest with the following configuration:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Running Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/models/User.test.js

# Run in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Writing Backend Tests

#### Model Tests

```javascript
describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'referrer',
      });

      expect(user.email).toBe('test@example.com');
    });
  });
});
```

#### Service Tests

```javascript
describe('MessagingService', () => {
  it('should send Viber message', async () => {
    const result = await messagingService.sendViberMessage('user123', 'Hello!');
    expect(result.success).toBe(true);
  });
});
```

#### API Integration Tests

```javascript
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Test Data Factories

Use factories to generate test data:

```javascript
// Create a user with default data
const user = await userFactory.create();

// Create with overrides
const admin = await userFactory.create({ role: 'platform_admin' });

// Create multiple
const users = await userFactory.createMany(5);
```

Available factories:
- `userFactory` - User model
- `companyFactory` - Company model
- `jobFactory` - Job model
- `referralFactory` - Referral model

## Frontend Testing

### Vitest Configuration

The frontend uses Vitest with React Testing Library:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

### Running Frontend Tests

```bash
# Run all tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode
npm run test:unit:watch

# Run specific file
npm run test:unit -- src/components/Button.test.tsx
```

### Writing Frontend Tests

#### Component Tests

```typescript
import { render, screen, fireEvent } from '@test/utils/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });
});
```

### MSW (Mock Service Worker)

Mock API requests in tests:

```typescript
import { rest } from 'msw';
import { server } from '@test/mocks/server';

// Override handler for specific test
server.use(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ name: 'Custom User' }));
  })
);
```

## E2E Testing

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
  },
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- e2e/auth.spec.ts

# Run in headed mode
npm run test:e2e -- --headed

# Run specific browser
npm run test:e2e -- --project=chromium
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

## Running Tests

### Complete Test Suite

```bash
# Run all tests (unit, integration, e2e)
npm run test:all

# Run with coverage
npm run test:all:coverage
```

### CI/CD Integration

Tests are automatically run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: |
    npm run test:unit -- --coverage
    npm run test:integration
    npm run test:e2e
```

## Writing Tests

### Test Naming Conventions

- Test files: `*.test.js` or `*.spec.ts`
- Describe blocks: Use descriptive names
- Test names: Start with "should"

```javascript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // test code
    });

    it('should throw error for duplicate email', async () => {
      // test code
    });
  });
});
```

### AAA Pattern

Structure tests using Arrange-Act-Assert:

```javascript
it('should calculate total earnings', async () => {
  // Arrange
  const referrals = [
    { status: 'hired', paidAmount: 100000 },
    { status: 'hired', paidAmount: 200000 },
  ];

  // Act
  const total = calculateTotalEarnings(referrals);

  // Assert
  expect(total).toBe(300000);
});
```

### Mocking

Use appropriate mocking strategies:

```javascript
// Mock external API
jest.mock('axios');

// Mock module
jest.mock('../services/emailService');

// Mock function
const mockFn = jest.fn();

// Spy on method
jest.spyOn(service, 'method').mockResolvedValue({ success: true });
```

## Best Practices

### DO

- Write tests before fixing bugs
- Keep tests independent and isolated
- Use descriptive test names
- Test edge cases and error scenarios
- Clean up test data after tests
- Use factories for test data
- Mock external dependencies

### DON'T

- Don't write tests that depend on each other
- Don't test implementation details
- Don't ignore test failures
- Don't write tests without assertions
- Don't use real external APIs in tests

## Troubleshooting

### Common Issues

#### Test Timeouts

```javascript
// Increase timeout for specific test
it('slow test', async () => {
  // test code
}, 30000);

// Or globally in config
testTimeout: 30000;
```

#### Database Connection Issues

```bash
# Ensure MongoDB is running
mongod --version

# Check connection string
MONGODB_URI=mongodb://localhost:27017/trm_test
```

#### Mock Not Working

```javascript
// Ensure mock is set up before import
jest.mock('./module', () => ({
  method: jest.fn(),
}));

// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG_TESTS=true npm test

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Coverage Reports

Coverage reports are generated in:
- Backend: `./coverage/lcov-report/index.html`
- Frontend: `./coverage/index.html`

Open in browser to view detailed coverage information.

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)

## Support

For testing-related questions or issues:
1. Check this guide first
2. Search existing tests for examples
3. Ask in the development team channel
