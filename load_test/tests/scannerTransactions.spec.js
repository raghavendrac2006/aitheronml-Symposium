const { test, expect } = require('@playwright/test');

test('Verify Check-in and Food Redemption Scanner Transactions', async ({ page }) => {
    // 1. REGISTER A NEW PARTICIPANT FOR TESTING
    console.log("Navigating to registration page...");
    await page.goto('http://localhost:3000/?mode=register');

    const nameInput = page.locator('input[placeholder*="Elena Rodriguez"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });

    const testName = 'Test Scanner Participant ' + Date.now();
    await nameInput.fill(testName);
    await page.locator('input[placeholder*="Stanford University"]').fill('Transaction testing College');
    await page.locator('input[placeholder*="Computer Science"]').fill('Information Technology');
    await page.locator('select').selectOption('4th Year');
    await page.locator('input[placeholder*="+91"]').fill('9999999999');
    await page.locator('input[placeholder*="elena@research.edu"]').fill('scan_transaction_test@gmail.com');

    // Select an individual event
    const eventCheckbox = page.locator('text=Paper Presentation').first();
    await eventCheckbox.click();

    // Click submit registration button
    const submitBtn = page.locator('button:has-text("Submit Registration")');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    console.log("Waiting for successful registration...");
    const successTitle = page.locator('h1:has-text("Registration Successful")');
    await expect(successTitle).toBeVisible({ timeout: 10000 });

    // Extract the generated Participant ID from monospace layout
    const participantIdElement = page.locator('span.font-mono').first();
    const participantId = (await participantIdElement.innerText()).trim();
    console.log(`Successfully registered participant ID: ${participantId}`);

    // 2. LOGIN AS REGISTRATION VOLUNTEER
    console.log("Navigating to login page...");
    await page.goto('http://localhost:3000/login');

    const emailInput = page.locator('#email');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill('registration@aitheronml.in');
    await page.locator('#password').fill('12345678');
    await page.locator('#sign-in-btn').click();

    console.log("Waiting for registration desk dashboard to load...");
    // Verify we landed on registration search dashboard
    const searchInput = page.locator('#console-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 3. PASS CHECK-IN SCANNER DESK
    console.log("Navigating to Pass Check-in tab...");
    await page.locator('button:has-text("Pass Check-in")').click();

    const scanInput = page.locator('input[placeholder*="Scan QR Pass"]');
    await expect(scanInput).toBeVisible({ timeout: 5000 });

    // Scan / input the Participant ID
    console.log(`Typing participant ID: ${participantId} for check-in...`);
    await scanInput.fill(participantId);

    // Wait for real-time preview card to match and render
    const activateButton = page.locator('button:has-text("Activate Pass")');
    await expect(activateButton).toBeVisible({ timeout: 5000 });

    console.log("Clicking Activate Pass...");
    await activateButton.click();

    // 4. VERIFY GREEN SUCCESS SCREEN
    console.log("Verifying Check-in Success View...");
    await expect(page.locator('h1:has-text("Check-in Verified")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${participantId}`)).toBeVisible();

    // 5. VERIFY AUTOMATIC RESET AFTER 3 SECONDS
    console.log("Waiting for automatic reset back to scanner mode...");
    // Wait for the 3 seconds timer plus a small buffer
    await page.waitForTimeout(3800);
    await expect(scanInput).toBeVisible({ timeout: 5000 });
    await expect(scanInput).toHaveValue('');

    // 6. VERIFY RED DUPLICATE CHECK-IN EXCEPTION
    console.log("Scanning same participant ID again to verify duplicate check-in rejection...");
    await scanInput.fill(participantId);
    await expect(activateButton).toBeVisible({ timeout: 5000 });
    await activateButton.click();

    console.log("Verifying Check-in Duplicate Rejection View...");
    await expect(page.locator('h1:has-text("Check-in Rejected")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Participant already checked in.')).toBeVisible();
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${participantId}`)).toBeVisible();

    // Wait for auto-reset again
    await page.waitForTimeout(3800);

    // 7. FOOD REDEMPTION SCANNER DESK
    console.log("Navigating to Food Redemption tab...");
    await page.locator('button:has-text("Food Redemption")').click();
    await expect(scanInput).toBeVisible({ timeout: 5000 });

    console.log(`Typing participant ID: ${participantId} for lunch coupon redemption...`);
    await scanInput.fill(participantId);

    const serveFoodButton = page.locator('button:has-text("Serve Food")');
    await expect(serveFoodButton).toBeVisible({ timeout: 5000 });

    console.log("Clicking Serve Food...");
    await serveFoodButton.click();

    // 8. VERIFY GREEN FOOD REDEMPTION SUCCESS
    console.log("Verifying Food Served Success View...");
    await expect(page.locator('h1:has-text("Food Served")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${participantId}`)).toBeVisible();

    // Wait for auto-reset
    await page.waitForTimeout(3800);

    // 9. VERIFY RED DUPLICATE FOOD REDEMPTION EXCEPTION
    console.log("Scanning same participant ID again to verify duplicate food redemption rejection...");
    await scanInput.fill(participantId);
    await expect(serveFoodButton).toBeVisible({ timeout: 5000 });
    await serveFoodButton.click();

    console.log("Verifying Food Redemption Duplicate Rejection View...");
    await expect(page.locator('h1:has-text("Redemption Rejected")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Food Already Redeemed.')).toBeVisible();
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${participantId}`)).toBeVisible();

    console.log("All transaction checks and scanner feedback behaviors verified successfully!");
});
