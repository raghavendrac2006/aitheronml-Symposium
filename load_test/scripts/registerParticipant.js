const config = require('../config/testConfig');
const { expect } = require('@playwright/test');
const { generateParticipant } = require('../utils/dataGenerator');

async function registerParticipant(browser, participantNumber) {

    const participant = generateParticipant(Date.now() + participantNumber);

    const page = await browser.newPage();

    const result = {
        participantNumber,
        success: false,
        morningId: null,
        afternoonId: null,
        error: null,
        timeTaken: 0
    };

    const startTime = Date.now();

    try {

        console.log("\n========================================");
        console.log(`Starting Registration ${participantNumber}`);
        console.log("========================================");

        //------------------------------------
        // Open Website
        //------------------------------------

        await page.goto(config.registrationURL);

        await page.getByRole('textbox', {
            name: 'e.g. Dr. Elena Rodriguez'
        }).waitFor();

        console.log("Website Loaded");

        //------------------------------------
        // Basic Details
        //------------------------------------

        await page.getByRole('textbox', {
            name: 'e.g. Dr. Elena Rodriguez'
        }).fill(participant.fullName);

        await page.getByRole('textbox', {
            name: 'e.g. Stanford University'
        }).fill(participant.college);

        await page.getByRole('textbox', {
            name: 'e.g. Computer Science'
        }).fill(participant.department);

        await page.getByRole('combobox')
            .selectOption(participant.year);

        await page.getByRole('textbox', {
            name: 'e.g. +91'
        }).fill(participant.phone);

        await page.getByRole('textbox', {
            name: 'e.g. elena@research.edu'
        }).fill(participant.email);

        console.log("Basic Details Filled");

        //------------------------------------
        // Event Selection (Random Individual Event)
        //------------------------------------

        const individualEvents = [
            "Paper Presentation",
            "Photography",
            "White Coding"
        ];

        // Select one random individual event
        const selectedEvent =
            individualEvents[Math.floor(Math.random() * individualEvents.length)];

        console.log(
            `Registration ${participantNumber} -> Selected Event: ${selectedEvent}`
        );

        await page.getByText(selectedEvent, { exact: true }).click();

        await page.waitForTimeout(1000);

        console.log("Random Individual Event Selected");

        //------------------------------------
        // Submit
        //------------------------------------

        const submitButton = page.getByRole('button', {
            name: /Submit Registration/i
        });

        await submitButton.scrollIntoViewIfNeeded();

        await page.waitForTimeout(500);

        console.log("Submitting Registration...");

        await submitButton.click();

        //------------------------------------
        // Wait For Success Page
        //------------------------------------

        await expect(
            page.getByText("Morning Participant ID")
        ).toBeVisible({
            timeout: 30000
        });

        console.log("Success Page Loaded");

        //------------------------------------
        // Print Success Page
        //------------------------------------

        const pageText = await page.locator("body").innerText();

        console.log("\n===== SUCCESS PAGE =====");
        console.log(pageText);
        console.log("========================\n");

        result.success = true;

        //------------------------------------
        // Wait Before Closing
        //------------------------------------

        console.log(`Waiting ${config.waitAfterSuccess / 1000} seconds before closing browser...`);

        await page.waitForTimeout(config.waitAfterSuccess);

    }
    catch (error) {

        result.success = false;
        result.error = error.message;

        console.log("\nRegistration Failed\n");
        console.log(error.message);

    }

    finally {

        result.timeTaken =
            ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(
            `Registration ${participantNumber} finished in ${result.timeTaken} sec`
        );

        await page.close();

    }

    return result;

}

module.exports = {
    registerParticipant
};