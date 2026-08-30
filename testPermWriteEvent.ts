import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "./src/firebase";

async function check() {
  try {
    const eventRef = doc(db, 'events', 'paper_presentation');
    await updateDoc(eventRef, { registeredCount: increment(1) });
    console.log("Event updated successfully.");
  } catch (e: any) {
    console.error("Error updating event:", e.message);
  }
  process.exit(0);
}
check();
