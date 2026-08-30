import { getDocs, collection } from "firebase/firestore";
import { db } from "./src/firebase";

async function countAttendees() {
  try {
    const snapshot = await getDocs(collection(db, "participants"));
    console.log(`\n\n=== TOTAL REGISTRATIONS: ${snapshot.size} ===\n\n`);
    
    // Just to get the latest ID generated for proof
    let maxId = 0;
    snapshot.forEach(doc => {
      const idStr = doc.data().participantId;
      if (idStr) {
        const num = parseInt(idStr.split('-')[1]);
        if (!isNaN(num) && num > maxId) maxId = num;
      }
    });
    console.log(`Latest generated Participant ID counter: ${maxId}`);
    
  } catch (e) {
    console.error("Error fetching", e);
  }
}

countAttendees();
