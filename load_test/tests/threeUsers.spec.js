const { test } = require('@playwright/test');
const { registerParticipant } = require('../scripts/registerParticipant');

test(
    'Verify 3 Sequential Registrations',
    async ({ browser }) => {
        console.log("\n====================================");
        console.log("STARTING 3 USER VERIFICATION TEST");
        console.log("====================================\n");

        const results = [];

        for (let i = 1; i <= 3; i++) {
            const result = await registerParticipant(browser, i);
            results.push(result);

            // Wait 2 seconds before the next registration
            if (i < 3) {
                console.log("\nWaiting 2 seconds before next registration...\n");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log("\n");
        console.log("==========================================");
        console.log("         TEST SUMMARY");
        console.log("==========================================");

        let successCount = 0;
        let failedCount = 0;

        results.forEach(result => {
            if (result.success) {
                successCount++;
                console.log(
                    `Registration ${result.participantNumber}  ✅ SUCCESS (${result.timeTaken}s)`
                );
            } else {
                failedCount++;
                console.log(
                    `Registration ${result.participantNumber}  ❌ FAILED`
                );
                console.log(`Reason: ${result.error}`);
            }
        });

        console.log("------------------------------------------");
        console.log(`Total Attempted : ${results.length}`);
        console.log(`Successful      : ${successCount}`);
        console.log(`Failed          : ${failedCount}`);
        console.log("==========================================");
    }
);