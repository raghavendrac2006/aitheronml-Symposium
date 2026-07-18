const { test, expect } = require('@playwright/test');

test('Verify QR Pass Auto-Download', async ({ page }) => {
    // Open home registration page
    await page.goto('http://localhost:3000/?mode=register');

    // Wait for the name input
    const nameInput = page.locator('input[placeholder*="Elena Rodriguez"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });

    // Fill in participant details
    await nameInput.fill('Jane Doe');
    await page.locator('input[placeholder*="Stanford University"]').fill('Kuppam Engineering College');
    await page.locator('input[placeholder*="Computer Science"]').fill('Information Technology');
    await page.locator('select').selectOption('4th Year');
    await page.locator('input[placeholder*="+91"]').fill('8888888888');
    await page.locator('input[placeholder*="elena@research.edu"]').fill('janedoe@gmail.com');

    // Select an individual event
    const eventCheckbox = page.locator('text=Paper Presentation').first();
    await eventCheckbox.click();

    // Setup listener for the automatic download event
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click submit registration button
    const submitBtn = page.locator('button:has-text("Submit Registration")');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    console.log("Registration submitted, waiting for automatic pass download...");

    // Wait for the download to be triggered
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    console.log(`PASS DOWNLOADED: ${filename}`);

    // Verify filename format matches SYM-XXXXXX.png
    expect(filename).toMatch(/^SYM-\d{6}\.png$/);

    // Save the downloaded pass file inside test-results/
    const outputPath = `a:/symposium/load_test/test-results/${filename}`;
    await download.saveAs(outputPath);
    console.log(`Saved pass ticket to: ${outputPath}`);

    // Verify success message is rendered in the UI
    const successTitle = page.locator('h1:has-text("Registration Successful")');
    await expect(successTitle).toBeVisible({ timeout: 5000 });
});
