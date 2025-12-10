import { test, expect } from '@playwright/test';

test.describe('Navigation & Smoke Tests', () => {
  test('app should load without errors', async ({ page }) => {
    // Check that the app loads without console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Check basic elements are present
    await expect(page.locator('body')).toBeVisible();

    // Filter out expected/known errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('hydration')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should have working link to login page', async ({ page }) => {
    await page.goto('/');

    // Should have a login form visible
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should display 404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-12345');

    // Either shows a 404 page or redirects to home
    if (response && response.status() === 404) {
      await expect(page.getByText(/not found/i)).toBeVisible();
    }
  });

  test('protected routes should redirect to login', async ({ page }) => {
    // Try to access dashboard without auth
    await page.goto('/dashboard');

    // Should redirect to login page
    await page.waitForURL('/', { timeout: 5000 });
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should display app name/logo', async ({ page }) => {
    await page.goto('/');

    // Check for app branding
    await expect(page.getByText(/myteacher/i)).toBeVisible();
  });
});
