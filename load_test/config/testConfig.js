module.exports = {

    // ----------------------------------
    // Load Test Settings
    // ----------------------------------

    totalRegistrations: 250, // Increase count for higher load testing
    concurrentBrowsers: 6, // Maintain 6 parallel instances

    registrationURL:
        "http://localhost:3000/?mode=register&hideAdminSignIn=true",

    waitAfterSuccess: 500,

    // ----------------------------------
    // Test Mode
    // ----------------------------------

    mode: "realistic",      // realistic | stress

    // ----------------------------------
    // Human Behaviour
    // ----------------------------------

    typingDelayMin: 30,
    typingDelayMax: 80,

    thinkDelayMin: 100,
    thinkDelayMax: 400,

    submitDelayMin: 100,
    submitDelayMax: 500,

    // ----------------------------------
    // Race Condition
    // ----------------------------------

    raceConditionPercentage: 10,

    // ----------------------------------

    delayBetweenRegistrations: 100

};