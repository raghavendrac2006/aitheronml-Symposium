import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "./src/firebase";

async function check() {
  try {
    const counterRef = doc(db, 'counters', 'symposium');
    await updateDoc(counterRef, { currentValue: increment(1) });
    console.log("Counter updated successfully.");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
check();
