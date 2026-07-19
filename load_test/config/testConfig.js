module.exports = {

    // ----------------------------------
    // Load Test Settings
    // ----------------------------------

    totalRegistrations: 200,
    concurrentBrowsers: 8,

    registrationURL:
        "https://aitheronml-symposium.vercel.app/?mode=register&hideAdminSignIn=true",

    waitAfterSuccess: 5000,

    // ----------------------------------
    // Test Mode
    // ----------------------------------

    mode: "realistic",      // realistic | stress

    // ----------------------------------
    // Human Behaviour
    // ----------------------------------

    typingDelayMin: 30,
    typingDelayMax: 80,

    thinkDelayMin: 1000,
    thinkDelayMax: 4000,

    submitDelayMin: 1000,
    submitDelayMax: 5000,

    // ----------------------------------
    // Race Condition
    // ----------------------------------

    raceConditionPercentage: 10,

    // ----------------------------------

    delayBetweenRegistrations: 1000

};