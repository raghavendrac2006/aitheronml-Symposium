const { test, expect } = require('@playwright/test');

test('Verify Super Admin Registration Toggle and Validation', async ({ page }) => {
    // 1. Login as Super Admin
    console.log("Navigating to login page...");
    await page.goto("http://localhost:3000/login");

    console.log("Typing super admin credentials...");
    await page.locator('#email').fill("superadmin@aitheronml.in");
    await page.locator('#password').fill("12345678");
    await page.locator('#sign-in-btn').click();

    console.log("Waiting for Super Admin Dashboard...");
    await page.getByText("Symposium Overview").waitFor();

    // 2. Go to Settings tab
    console.log("Navigating to settings panel...");
    await page.getByRole('button', { name: /Settings/i }).click();

    // Check if toggle button exists
    const toggleButton = page.getByRole('button', { name: /Stop Public Registrations/i });
    await toggleButton.waitFor();

    // 3. Stop registrations
    console.log("Disabling public registrations...");
    page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('disabled');
        await dialog.accept();
    });
    await toggleButton.click();

    // Verify status indicates suspended
    await expect(page.getByText("○ Suspended")).toBeVisible();

    // 4. Verify public registration URL is closed
    console.log("Checking public registration status...");
    await page.goto("http://localhost:3000/?mode=register&hideAdminSignIn=true");
    await expect(page.getByText("Registrations Closed")).toBeVisible();
    await expect(page.getByText("The online registration portal for the CSM Symposium has been closed")).toBeVisible();

    // 5. Go back to login, admin dashboard, and turn registrations back ON
    console.log("Returning to admin login...");
    await page.goto("http://localhost:3000/login");
    await page.locator('#email').fill("superadmin@aitheronml.in");
    await page.locator('#password').fill("12345678");
    await page.locator('#sign-in-btn').click();

    console.log("Navigating back to settings to enable registrations...");
    await page.getByRole('button', { name: /Settings/i }).click();
    
    const enableButton = page.getByRole('button', { name: /Start Public Registrations/i });
    page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('enabled');
        await dialog.accept();
    });
    await enableButton.click();

    // Verify status is Active
    await expect(page.getByText("● Active")).toBeVisible();

    // 6. Verify public registration works again
    console.log("Verifying registration form is active again...");
    await page.goto("http://localhost:3000/?mode=register&hideAdminSignIn=true");
    await expect(page.getByRole('textbox', { name: 'e.g. Dr. Elena Rodriguez' })).toBeVisible();
    console.log("Registration portal toggle fully verified!");
});
