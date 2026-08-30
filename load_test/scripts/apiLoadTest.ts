import { saveParticipantsWithAtomicIds } from "../../src/firebaseSync";
import { Attendee } from "../../src/types";

// Mock localStorage for Node environment
(global as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
(global as any).window = undefined;

// Random data generator
const EVENTS = [
  { id: "paper_presentation", title: "Paper Presentation" },
  { id: "photography", title: "Photography" },
  { id: "vibe_coding", title: "Vibe Coding" }
];

function generateParticipant(i: number): any {
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  return {
    name: `Load Test User ${i}`,
    email: `user${i}_${Date.now()}@example.com`,
    phone: `+9198765${String(i).padStart(5, '0')}`,
    college: "Kuppam Engineering College",
    branch: "Computer Science",
    year: "3rd Year",
    eventId: event.id,
    registeredEventTitle: event.title,
    attendanceStatus: "Pending",
    regType: "individual",
    registrationType: "individual",
    createdAt: new Date().toISOString()
  };
}

async function runApiLoadTest() {
  console.log("==================================================");
  console.log("🚀 STARTING DIRECT API LOAD TEST (200 USERS) 🚀");
  console.log("==================================================");
  
  const totalUsers = 200;
  let successCount = 0;
  let failCount = 0;
  
  const startTime = Date.now();

  // We will simulate 6 concurrent users hitting the submit button continuously
  // until 200 registrations are met. This perfectly mimics the UI test but bypasses Playwright.
  const concurrency = 6;
  let currentIndex = 1;

  async function worker(workerId: number) {
    while (true) {
      const i = currentIndex++;
      if (i > totalUsers) break;

      const template = generateParticipant(i);
      
      try {
        // saveParticipantsWithAtomicIds takes (templates, isSpot, createdBy)
        await saveParticipantsWithAtomicIds([template], false, 'load_test_api');
        successCount++;
        console.log(`[Worker ${workerId}] ✅ Successfully registered user ${i}`);
      } catch (err: any) {
        failCount++;
        console.error(`[Worker ${workerId}] ❌ Failed user ${i}:`, err.message);
      }
      
      // Tiny delay to simulate network roundtrip and prevent extreme local CPU spikes
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Start workers
  const promises = [];
  for (let w = 1; w <= concurrency; w++) {
    promises.push(worker(w));
  }

  await Promise.all(promises);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n==================================================");
  console.log("🎉 API LOAD TEST COMPLETED 🎉");
  console.log("==================================================");
  console.log(`Total Time: ${duration} seconds`);
  console.log(`Successful Registrations: ${successCount}`);
  console.log(`Failed Registrations: ${failCount}`);
  console.log("==================================================\n");
  
  process.exit(0);
}

runApiLoadTest().catch(console.error);
