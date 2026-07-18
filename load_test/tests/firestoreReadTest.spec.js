const { test, chromium } = require('@playwright/test');
const config = require('../config/readTestConfig');
const { searchParticipant } = require('../scripts/searchParticipant');

test.setTimeout(10 * 60 * 1000); // 10 minutes timeout for load testing

test('Firestore Read Stress Test', async () => {
    console.log('\n======================================');
    console.log('AItheronML Symposium Firestore Read Stress Test');
    console.log('======================================');
    console.log(`Total Searches      : ${config.totalSearches}`);
    console.log(`Concurrent Workers  : ${config.concurrentBrowsers}`);
    console.log(`Target Roster URL   : ${config.registrationDeskURL}`);
    console.log(`Participant ID Range: CSM-${String(config.minimumParticipantID).padStart(6, '0')} to CSM-${String(config.maximumParticipantID).padStart(6, '0')}`);
    console.log('======================================\n');

    let nextSearchIndex = 1;
    let successfulReads = 0;
    let failedReads = 0;
    const searchTimes = [];

    const startTime = Date.now();

    // Worker process running in parallel
    async function worker(workerId) {
        // Launch a single browser context per worker to reuse context and avoid overhead
        const browser = await chromium.launch({
            headless: false // Visible browser mode to watch actions if debugging, easily runs headless in CI
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
            // Navigate to target desk URL
            await page.goto(config.registrationDeskURL);

            while (true) {
                const searchIdx = nextSearchIndex++;
                if (searchIdx > config.totalSearches) {
                    break;
                }

                // Randomly generate sequential participant ID within configured bounds
                const randomNum = Math.floor(Math.random() * (config.maximumParticipantID - config.minimumParticipantID + 1)) + config.minimumParticipantID;
                const participantId = `CSM-${String(randomNum).padStart(6, '0')}`;

                console.log(`----------------------------------------`);
                console.log(`Worker ${workerId} (#${searchIdx})`);
                console.log(`Searching: ${participantId}`);

                try {
                    const result = await searchParticipant(page, participantId);

                    if (result.success) {
                        successfulReads++;
                        searchTimes.push(result.searchTime);

                        if (result.found) {
                            console.log(`Participant Found`);
                            console.log(`Search Time: ${result.searchTime.toFixed(2)} sec`);
                        } else {
                            console.log(`Participant Not Found`);
                            console.log(`Search Time: ${result.searchTime.toFixed(2)} sec`);
                        }
                    } else {
                        failedReads++;
                        console.error(`Search Failed`);
                        console.error(`Error: ${result.error || 'Unknown Error'}`);
                    }
                } catch (searchErr) {
                    failedReads++;
                    console.error(`Search Crashed`);
                    console.error(`Error: ${searchErr.message}`);
                }

                console.log(`----------------------------------------`);

                // Realistic think delay simulation
                const thinkDelay = Math.floor(Math.random() * (config.thinkingDelayMax - config.thinkingDelayMin)) + config.thinkingDelayMin;
                await page.waitForTimeout(thinkDelay);

                // Delay between subsequent searches
                await page.waitForTimeout(config.delayBetweenSearches);
            }
        } catch (workerErr) {
            console.error(`Worker ${workerId} encountered a fatal context crash:`, workerErr.message);
        } finally {
            await browser.close();
        }
    }

    // Spawn concurrent workers in parallel
    const workers = [];
    for (let i = 1; i <= config.concurrentBrowsers; i++) {
        workers.push(worker(i));
    }

    await Promise.all(workers);

    const totalDuration = (Date.now() - startTime) / 1000;
    
    // Performance metrics calculation
    const totalSearchesRun = successfulReads + failedReads;
    const avgSearchTime = searchTimes.length > 0 
        ? searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length 
        : 0;
    const fastestSearch = searchTimes.length > 0 ? Math.min(...searchTimes) : 0;
    const slowestSearch = searchTimes.length > 0 ? Math.max(...searchTimes) : 0;

    // Print final detailed report
    console.log('\n========================================');
    console.log('READ TEST FINISHED');
    console.log('========================================');
    console.log(`Total Searches      : ${totalSearchesRun}`);
    console.log(`Successful Reads    : ${successfulReads}`);
    console.log(`Failed Reads        : ${failedReads}`);
    console.log(`Average Search Time : ${avgSearchTime.toFixed(2)} sec`);
    console.log(`Fastest Search      : ${fastestSearch.toFixed(2)} sec`);
    console.log(`Slowest Search      : ${slowestSearch.toFixed(2)} sec`);
    console.log(`Total Duration      : ${totalDuration.toFixed(2)} seconds`);
    console.log('========================================\n');
});
