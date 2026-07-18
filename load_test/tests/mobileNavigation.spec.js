const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 375, height: 667 } }); // Simulate iPhone viewport

test('Verify Mobile Drawer Navigation for Registration Desk', async ({ page }) => {
    console.log("Navigating to login page on mobile viewport...");
    await page.goto('http://localhost:3000/login');

    const emailInput = page.locator('#email');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('registration@aitheronml.in');
    await page.locator('#password').fill('12345678');
    await page.locator('#sign-in-btn').click();

    console.log("Waiting for dashboard to load...");
    // By default, it opens the Overview/Dashboard tab
    await expect(page.locator('text=Symposium Overview')).toBeVisible({ timeout: 10000 });

    // The desktop sidebar should be hidden
    const desktopNav = page.locator('nav.hidden.lg\\:flex');
    await expect(desktopNav).not.toBeVisible();

    // Verify mobile menu button is visible in header
    console.log("Checking mobile menu button visibility...");
    const mobileMenuBtn = page.locator('button[title="Open Menu"]');
    await expect(mobileMenuBtn).toBeVisible();

    // Open mobile menu
    console.log("Opening mobile sidebar drawer...");
    await mobileMenuBtn.click();

    // Verify sliding panel drawer is visible
    const mobileDrawer = page.locator('nav.z-55');
    await expect(mobileDrawer).toBeVisible({ timeout: 3000 });

    // Verify the links inside the drawer are visible
    const passCheckInLink = mobileDrawer.locator('button:has-text("Pass Check-in")');
    await expect(passCheckInLink).toBeVisible();
    
    const foodRedemptionLink = mobileDrawer.locator('button:has-text("Food Redemption")');
    await expect(foodRedemptionLink).toBeVisible();

    // Click on Pass Check-in link
    console.log("Clicking Pass Check-in tab in mobile menu...");
    await passCheckInLink.click();

    // Drawer should auto-close
    await expect(mobileDrawer).not.toBeVisible({ timeout: 3000 });

    // Scanner Desk should be rendered now
    console.log("Verifying Pass Activation Desk is visible...");
    const scannerHeader = page.locator('h2:has-text("Pass Activation Desk")');
    await expect(scannerHeader).toBeVisible({ timeout: 5000 });
    
    console.log("Mobile responsive navigation drawer verified successfully!");
});
