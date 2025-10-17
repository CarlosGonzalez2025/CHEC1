// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrwgO51-gQ1qO7FwbykKnhvXQIU571Z6c",
  authDomain: "moodsnap-sa0d8.firebaseapp.com",
  projectId: "moodsnap-sa0d8",
  storageBucket: "moodsnap-sa0d8.firebasestorage.app",
  messagingSenderId: "673075225297",
  appId: "1:673075225297:web:9d35ea43faba76a2c59bf0"
};

// Initialize Firebase
let app;
let db;
let auth;
let storage;

// This prevents Firebase from being initialized more than once
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

try {
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Error initializing Firebase services. Please check your Firebase project configuration.", error);
}

export { app, db, auth, storage };
