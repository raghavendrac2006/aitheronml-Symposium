import { collection, getDocs, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { db } from "./src/firebase";

async function clearDB() {
  console.log("Starting database cleanup...");
  
  try {
    const auth = getAuth();
    console.log("Authenticating as superadmin...");
    await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL || "admin@example.com", process.env.ADMIN_PASSWORD || "your-admin-password");
    console.log("Authenticated successfully.");

    // 1. Delete all participants
    console.log("Fetching participants...");
    const participantsSnap = await getDocs(collection(db, "participants"));
    console.log(`Found ${participantsSnap.size} participants. Deleting...`);
    let count = 0;
    for (const d of participantsSnap.docs) {
      await deleteDoc(d.ref);
      count++;
      if (count % 100 === 0) console.log(`Deleted ${count} participants...`);
    }
    console.log("All participants deleted.");

    // 2. Reset event registered counts
    console.log("Fetching events...");
    const eventsSnap = await getDocs(collection(db, "events"));
    for (const d of eventsSnap.docs) {
      await updateDoc(d.ref, { registeredCount: 0 });
    }
    console.log("Event counts reset to 0.");

    // 3. Reset ID counter
    console.log("Resetting master ID counter...");
    await setDoc(doc(db, "counters", "symposium"), { currentValue: 0 });
    console.log("Counter reset.");

    console.log("Database cleared successfully!");
  } catch (error: any) {
    console.error("Failed to clear database:", error.message);
    if (error.message?.includes("Quota exceeded") || error.code === 'resource-exhausted') {
      console.error("\nFATAL: You cannot delete the database right now because you are out of Firebase Quota (Deletes count as Writes). You must upgrade to Blaze or wait until the quota resets to clear the DB from code.");
    }
  }
  process.exit(0);
}

clearDB();
