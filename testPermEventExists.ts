import { doc, getDoc } from "firebase/firestore";
import { db } from "./src/firebase";

async function check() {
  const eventRef = doc(db, 'events', 'white_coding');
  const eventSnap = await getDoc(eventRef);
  console.log("White Coding exists:", eventSnap.exists());
  process.exit(0);
}
check();
