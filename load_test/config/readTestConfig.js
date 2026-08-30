module.exports = {
    // ----------------------------------
    // Stress Test Settings
    // ----------------------------------
    totalSearches: 50,
    concurrentBrowsers: 5,
    minimumParticipantID: 1,
    maximumParticipantID: 200,

    // Target application URL (Registration Desk Console)
    registrationDeskURL: "https://aitheronml-symposium.vercel.app/registration",

    // ----------------------------------
    // Realistic Human Behavior Delays (ms)
    // ----------------------------------
    typingDelayMin: 50,
    typingDelayMax: 150,

    thinkingDelayMin: 1000,
    thinkingDelayMax: 3000,

    delayBetweenSearches: 1000
};
