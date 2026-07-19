const { test, chromium } = require('@playwright/test');

const config = require('../config/testConfig');
const { registerParticipant } = require('../scripts/registerParticipant');

test.setTimeout(10 * 60 * 1000); // 10 minutes

test('Load Test', async () => {

    console.log('\n======================================');
    console.log('AItheronML Symposium Load Test');
    console.log('======================================');

    console.log(`Total Registrations : ${config.totalRegistrations}`);
    console.log(`Concurrent Browsers : ${config.concurrentBrowsers}`);
    console.log('');

    let nextUser = 1;

    let success = 0;
    let failed = 0;

    const startTime = Date.now();

    async function worker(workerId) {

        const browser = await chromium.launch({
            headless: false
        });

        while (true) {

            const userId = nextUser++;

            if (userId > config.totalRegistrations)
                break;

            console.log(`Worker ${workerId} -> Registration ${userId}`);

            try {

                const result = await registerParticipant(browser, userId);

                if (result.success) {

                    success++;

                    console.log(`✅ Registration ${userId} Completed`);

                } else {

                    failed++;

                    console.log(`❌ Registration ${userId} Failed`);

                }

            } catch (error) {

                failed++;

                console.log(`❌ Registration ${userId} Crashed`);
                console.log(error.message);

            }

            await new Promise(resolve =>
                setTimeout(resolve, config.delayBetweenRegistrations)
            );

        }

        await browser.close();

    }

    const workers = [];

    for (let i = 1; i <= config.concurrentBrowsers; i++) {

        workers.push(worker(i));

    }

    await Promise.all(workers);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n======================================');
    console.log('LOAD TEST FINISHED');
    console.log('======================================');

    console.log(`Successful : ${success}`);
    console.log(`Failed     : ${failed}`);
    console.log(`Total Time : ${totalTime} seconds`);

    console.log('======================================\n');

});