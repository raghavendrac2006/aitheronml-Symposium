const { test, expect } = require('@playwright/test');
const { generateParticipant } = require('../utils/dataGenerator');

test('Complete Registration', async ({ page }) => {

    // Generate a unique participant every run
    const participant = generateParticipant(Date.now());

    console.log("Opening Website...");

    await page.goto(
        "https://aitheronml-symposium.vercel.app/?mode=register&hideAdminSignIn=true"
    );

    // Wait until React renders
    await page.getByRole('textbox', {
        name: 'e.g. Dr. Elena Rodriguez'
    }).waitFor();

    console.log("Website Loaded");

    // ===============================
    // BASIC DETAILS
    // ===============================

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

    // ===============================
    // EVENT SELECTION
    // ===============================

    await page.getByText("Paper Presentation").click();

    await page.waitForTimeout(1000);

    await page.getByText("Free Fire").click();

    console.log("Events Selected");

    // ===============================
    // TEAM DETAILS
    // ===============================

    await page.mouse.wheel(0, 2500);

    await page.waitForTimeout(1000);

    await page.getByRole('textbox', {
        name: 'e.g. Neural Frontiers Lab'
    }).waitFor();

    await page.getByRole('textbox', {
        name: 'e.g. Neural Frontiers Lab'
    }).fill(participant.teamName);

    console.log("Team Name Filled");

    await page.getByRole('button', {
        name: /Add Member/i
    }).click();

    await page.waitForTimeout(1000);

    console.log("Member Form Appeared");

    await page.getByRole('textbox', {
        name: 'Full Name'
    }).fill(participant.member.name);

    await page.getByRole('textbox', {
        name: 'Phone Number'
    }).fill(participant.member.phone);

    await page.getByRole('textbox', {
        name: 'Email Address'
    }).fill(participant.member.email);

    console.log("Member Details Filled");

    // ===============================
    // SUBMIT
    // ===============================

    const submitButton = page.getByRole('button', {
        name: /Submit Registration/i
    });

    await submitButton.scrollIntoViewIfNeeded();

    await page.waitForTimeout(500);

    console.log("Clicking Submit...");

    await submitButton.click();

    console.log("Submit Clicked");

    // ===============================
    // VERIFY SUCCESS
    // ===============================

    await expect(
        page.getByText("Morning Participant ID")
    ).toBeVisible();

    await expect(
        page.getByText("Afternoon Participant ID")
    ).toBeVisible();

    console.log("Registration Successful!");

    console.log("Registration Successful!");

    // Extract the generated Participant ID
    const pageText = await page.locator("body").innerText();

    const match = pageText.match(/[A-Z]{2,5}-\d{3,6}/);

    if (match) {
        console.log("Generated Participant ID:", match[0]);
    } else {
        console.log("Participant ID not found automatically.");
    }

    // Pause for inspection
    await page.waitForTimeout(5000);

});