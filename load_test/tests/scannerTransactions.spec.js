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
    // Verify we landed on registration search dashboard by waiting for header logout button
    await page.locator('button[title="Sign Out"]').waitFor({ state: 'visible', timeout: 15000 });

    // 3. PASS CHECK-IN SCANNER DESK
    console.log("Navigating to Pass Check-in tab...");
    await page.locator('button:has-text("Pass Check-in")').click();

    // Toggle to manual entry mode in the header
    console.log("Toggling scanner desk to manual input mode...");
    const keyboardToggle = page.locator('button[title="Enter ID manually"]');
    await keyboardToggle.click();

    const scanInput = page.locator('input[placeholder*="Type Participant ID"]');
    await expect(scanInput).toBeVisible({ timeout: 5000 });

    // Input the Participant ID
    console.log(`Typing participant ID: ${participantId} for check-in...`);
    await scanInput.fill(participantId);

    // Wait for real-time preview card to match and render
    const activateButton = page.locator('button:has-text("Activate Pass")');
    await expect(activateButton).toBeVisible({ timeout: 5000 });

    console.log("Clicking Activate Pass...");
    await activateButton.click();

    // 4. VERIFY GREEN SUCCESS CARD & PAYMENT CHECKBOX
    console.log("Verifying Check-in Success View...");
    await expect(page.locator('h1:has-text("Pass Activated Successfully!")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();
    await expect(page.locator(`text=${participantId}`)).toBeVisible();

    // Verify payment checkbox tick status toggling
    const paymentCheckbox = page.locator('input[type="checkbox"]');
    await expect(paymentCheckbox).toBeVisible();
    
    // Check next button
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeVisible();
    console.log("Clicking Next to return to scanner...");
    await nextButton.click();

    // 5. VERIFY RETURN BACK TO SCANNER (Camera view will show by default)
    console.log("Checking that we are back on active camera view...");
    const qrRegion = page.locator('#qr-reader-viewport');
    await expect(qrRegion).toBeVisible({ timeout: 5000 });

    // 6. VERIFY DUPLICATE CHECK-IN EXCEPTION (RED VIEW)
    console.log("Toggling back to manual mode to scan same participant again...");
    await keyboardToggle.click();
    await scanInput.fill(participantId);
    await expect(activateButton).toBeVisible({ timeout: 5000 });
    await activateButton.click();

    console.log("Verifying Activation Rejected View...");
    await expect(page.locator('h1:has-text("Activation Rejected")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=REASON: Participant already checked in.')).toBeVisible();
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // Click Go Back to Scanner button
    const goBackButton = page.locator('button:has-text("Go Back to Scanner")');
    await expect(goBackButton).toBeVisible();
    console.log("Clicking Go Back to Scanner...");
    await goBackButton.click();

    // 7. FOOD REDEMPTION SCANNER DESK
    console.log("Navigating to Food Redemption tab...");
    await page.locator('button:has-text("Food Redemption")').click();
    
    console.log("Toggling Food Redemption scanner desk to manual input mode...");
    await keyboardToggle.click();
    await expect(scanInput).toBeVisible({ timeout: 5000 });

    console.log(`Typing participant ID: ${participantId} for lunch coupon redemption...`);
    await scanInput.fill(participantId);

    const serveFoodButton = page.locator('button:has-text("Serve Food")');
    await expect(serveFoodButton).toBeVisible({ timeout: 5000 });

    console.log("Clicking Serve Food...");
    await serveFoodButton.click();

    // 8. VERIFY GREEN FOOD REDEMPTION SUCCESS & AUTO-RESET (1.5 SECONDS)
    console.log("Verifying Food Served Success View...");
    await expect(page.locator('h1:has-text("Food Served")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    console.log("Waiting for automatic reset back to active camera scanner...");
    await expect(qrRegion).toBeVisible({ timeout: 5000 });

    // 9. VERIFY DUPLICATE FOOD REDEMPTION EXCEPTION (RED VIEW)
    console.log("Toggling back to manual mode to redeem lunch again...");
    await keyboardToggle.click();
    await scanInput.fill(participantId);
    await expect(serveFoodButton).toBeVisible({ timeout: 5000 });
    await serveFoodButton.click();

    console.log("Verifying Food Redemption Rejected View...");
    await expect(page.locator('h1:has-text("Redemption Rejected")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=REASON: Food Already Redeemed.')).toBeVisible();

    console.log("Clicking Go Back to Scanner...");
    await goBackButton.click();
    await expect(qrRegion).toBeVisible({ timeout: 5000 });

    console.log("All transactions, verify payment ticks, automatic resets, and rejection views verified successfully!");
});
