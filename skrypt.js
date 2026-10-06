// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArKkXGEfenE8845CAG1rGZ4F8D3lBBAxs",
  authDomain: "losowe-paczki-lpp.firebaseapp.com",
  projectId: "losowe-paczki-lpp",
  storageBucket: "losowe-paczki-lpp.firebasestorage.app",
  messagingSenderId: "690500885245",
  appId: "1:690500885245:web:dbdcff49910ac4e188fc94",
  measurementId: "G-MJ4PG4P23T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
