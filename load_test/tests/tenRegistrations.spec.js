const { test } = require('@playwright/test');
const { generateParticipant } = require('../utils/dataGenerator');

test('10 Sequential Registrations', async ({ browser }) => {

    for (let i = 1; i <= 10; i++) {

        console.log(`\n========== Registration ${i} ==========`);

        const participant = generateParticipant(Date.now() + i);

        const page = await browser.newPage();

        await page.goto(
            "https://aitheronml-symposium.vercel.app/?mode=register&hideAdminSignIn=true"
        );

        await page.getByRole('textbox', {
            name: 'e.g. Dr. Elena Rodriguez'
        }).waitFor();

        // Basic Details

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

        // Events

        await page.getByText("Paper Presentation").click();

        await page.waitForTimeout(500);

        await page.getByText("Free Fire").click();

        // Team

        await page.mouse.wheel(0, 2500);

        await page.getByRole('textbox', {
            name: 'e.g. Neural Frontiers Lab'
        }).waitFor();

        await page.getByRole('textbox', {
            name: 'e.g. Neural Frontiers Lab'
        }).fill(participant.teamName);

        await page.getByRole('button', {
            name: /Add Member/i
        }).click();

        await page.waitForTimeout(800);

        await page.getByRole('textbox', {
            name: 'Full Name'
        }).fill(participant.member.name);

        await page.getByRole('textbox', {
            name: 'Phone Number'
        }).fill(participant.member.phone);

        await page.getByRole('textbox', {
            name: 'Email Address'
        }).fill(participant.member.email);

        const submitButton = page.getByRole('button', {
            name: /Submit Registration/i
        });

        await submitButton.scrollIntoViewIfNeeded();

        await submitButton.click();

        console.log(`Registration ${i} completed.`);

        await page.close();
    }

});