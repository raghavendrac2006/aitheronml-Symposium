const config = require('../config/readTestConfig');

/**
 * Simulates a volunteer searching for a participant by ID.
 * Performs realistic character-by-character typing and details card verification.
 * 
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {string} participantId - The ID to search (e.g. "CSM-000123")
 */
async function searchParticipant(page, participantId) {
    const result = {
        participantId,
        success: false,
        found: false,
        error: null,
        searchTime: 0
    };

    try {
        // 1. Authentication Check
        // If we are redirected to /login, fill in default credentials and sign in
        const emailInput = page.locator('#email');
        if (await emailInput.isVisible()) {
            console.log("Worker redirected to login. Authenticating...");
            await emailInput.fill('registration@aitheronml.in');
            await page.locator('#password').fill('12345678');
            await page.locator('#sign-in-btn').click();
            
            // Wait for search input to be ready on the /registration page
            await page.locator('#console-search-input').waitFor({ state: 'visible', timeout: 15000 });
            console.log("Authentication successful, registration desk console loaded.");
        }

        // Target the smart search input field
        const searchInput = page.locator('#console-search-input');
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });

        // 2. Clear Search Bar Realistically
        await searchInput.focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200); // Tiny pause after clear

        // 3. Type Participant ID with Random Human Keystroke Delays
        const startTime = Date.now();
        for (const char of participantId) {
            const delay = Math.floor(Math.random() * (config.typingDelayMax - config.typingDelayMin)) + config.typingDelayMin;
            await page.keyboard.type(char, { delay });
        }

        // 4. Wait for UI to Filter the Roster List
        const rowSelector = `#row-${participantId}`;
        const row = page.locator(rowSelector);
        const emptyState = page.locator('text=No participants matched');

        let found = false;
        try {
            // Race condition check: Wait for either the record row or the 'No Match' fallback
            await Promise.race([
                row.waitFor({ state: 'visible', timeout: 3000 }).then(() => { found = true; }),
                emptyState.waitFor({ state: 'visible', timeout: 3000 }).then(() => { found = false; })
            ]);
        } catch (raceErr) {
            // Fallback check if wait times out
            found = await row.isVisible();
        }

        // 5. Select Row and Verify Detail Panel Content
        if (found) {
            await row.click();

            // Wait for active profile card to bind the participant ID details
            const detailIdLocator = page.locator('strong.text-primary.font-bold').first();
            await detailIdLocator.waitFor({ state: 'visible', timeout: 2000 });

            const loadedIdText = await detailIdLocator.innerText();
            if (loadedIdText.trim() === participantId) {
                result.searchTime = (Date.now() - startTime) / 1000;
                result.found = true;
                result.success = true;
            } else {
                result.error = `Profile mismatch error: expected ${participantId}, but details loaded ${loadedIdText}`;
            }
        } else {
            // Participant does not exist in roster list (still a valid read operation execution)
            result.searchTime = (Date.now() - startTime) / 1000;
            result.found = false;
            result.success = true;
        }

    } catch (err) {
        result.success = false;
        result.error = err.message;
    }

    return result;
}

module.exports = {
    searchParticipant
};
