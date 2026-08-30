import { doc, setDoc } from "firebase/firestore";
import { db } from "./src/firebase";

async function check() {
  try {
    const partRef = doc(db, 'participants', 'test_part_1');
    await setDoc(partRef, { name: "Test" });
    console.log("Participant created successfully.");
  } catch (e: any) {
    console.error("Error creating participant:", e.message);
  }
  process.exit(0);
}
check();
