import { doc, getDoc } from "firebase/firestore";
import { db } from "./src/firebase";

async function check() {
  try {
    const counterRef = doc(db, 'counters', 'symposium');
    const counterSnap = await getDoc(counterRef);
    console.log("Counter exists:", counterSnap.exists());
    if (counterSnap.exists()) console.log("Counter data:", counterSnap.data());

    const eventRef = doc(db, 'events', 'paper_presentation');
    const eventSnap = await getDoc(eventRef);
    console.log("Event exists:", eventSnap.exists());
    if (eventSnap.exists()) console.log("Event data:", eventSnap.data());
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
check();
