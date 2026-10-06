import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  // Twoje dane konfiguracyjne z Firebase
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Zapisywanie danych
async function addData(data) {
  try {
    const docRef = await addDoc(collection(db, "twoja_kolekcja"), data);
    console.log("Dokument zapisany z ID: ", docRef.id);
  } catch (e) {
    console.error("Błąd podczas dodawania dokumentu: ", e);
  }
}

// Odczytywanie danych w czasie rzeczywistym
function listenToData() {
  const unsubscribe = onSnapshot(collection(db, "twoja_kolekcja"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        console.log("Nowy dokument: ", change.doc.data());
      }
    });
  });
}
