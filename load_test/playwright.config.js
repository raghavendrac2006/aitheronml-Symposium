// playwright.config.js

module.exports = {
    testDir: './tests',

    timeout: 60000,

    use: {
        headless: false,
        viewport: {
            width: 1366,
            height: 768
        },

        screenshot: 'only-on-failure',

        video: 'retain-on-failure',

        trace: 'retain-on-failure'
    }
};