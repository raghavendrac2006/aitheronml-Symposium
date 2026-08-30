function generateParticipant(id) {

    return {
        fullName: `Playwright User ${id}`,
        college: "Kuppam Engineering College",
        department: "CSE",
        year: "3rd Year",

        phone: `9${String(100000000 + (id % 899999999)).padStart(9, '0')}`,

        email: `playwright${id}@testmail.com`,

        teamName: `Nexus Team ${id}`,

        member: {
            name: `Member ${id}`,
            phone: `8${String(100000000 + (id % 899999999)).padStart(9, '0')}`,
            email: `member${id}@testmail.com`
        }
    };

}

module.exports = { generateParticipant };