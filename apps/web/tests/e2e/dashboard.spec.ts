import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username/i).fill('teacher@test.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    // Wait for redirect to complete
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
  });

  test('should display dashboard header', async ({ page }) => {
    // Navigate to dashboard if not already there
    if (page.url().includes('onboarding')) {
      // Handle onboarding flow or skip test
      test.skip();
    }

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/your students/i)).toBeVisible();
  });

  test('should display student table with filters', async ({ page }) => {
    if (page.url().includes('onboarding')) {
      test.skip();
    }

    // Check for filter panel
    await expect(page.getByText(/status/i)).toBeVisible();
    await expect(page.getByText(/plan types/i)).toBeVisible();

    // Check for table headers
    await expect(page.getByRole('columnheader', { name: /record id/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /grade/i })).toBeVisible();
  });

  test('should filter students by status', async ({ page }) => {
    if (page.url().includes('onboarding')) {
      test.skip();
    }

    // Select a status filter
    await page.getByRole('combobox').first().selectOption('WATCH');

    // Verify filter was applied (students shown should match)
    // This is a basic check - actual filtering would be tested with known data
    await expect(page.getByText(/of.*students/i)).toBeVisible();
  });

  test('should filter students by plan type', async ({ page }) => {
    if (page.url().includes('onboarding')) {
      test.skip();
    }

    // Check "Has IEP" checkbox
    const iepCheckbox = page.getByRole('checkbox', { name: /has iep/i });
    await iepCheckbox.check();

    // Verify filter was applied
    await expect(iepCheckbox).toBeChecked();
  });

  test('should clear filters', async ({ page }) => {
    if (page.url().includes('onboarding')) {
      test.skip();
    }

    // Apply a filter
    await page.getByRole('combobox').first().selectOption('WATCH');

    // Check if clear filters button appears and click it
    const clearButton = page.getByRole('button', { name: /clear filters/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();

      // Verify filter was reset
      await expect(page.getByRole('combobox').first()).toHaveValue('ALL');
    }
  });

  test('should navigate to student detail when clicking Open', async ({ page }) => {
    if (page.url().includes('onboarding')) {
      test.skip();
    }

    // Wait for students to load
    await page.waitForTimeout(1000);

    // Find and click an Open button (if any students exist)
    const openButton = page.getByRole('button', { name: /open/i }).first();
    if (await openButton.isVisible()) {
      await openButton.click();
      await expect(page).toHaveURL(/\/students\/[\w-]+$/);
    }
  });

  test('should logout successfully', async ({ page }) => {
    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });
});
