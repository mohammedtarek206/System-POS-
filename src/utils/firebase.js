import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBRQnULJlP22mNWKNBlLrjrcFrgU65bqyw",
    authDomain: "system-pos-1c777.firebaseapp.com",
    projectId: "system-pos-1c777",
    storageBucket: "system-pos-1c777.firebasestorage.app",
    messagingSenderId: "468082218442",
    appId: "1:468082218442:web:717cf245099257d0cdab33",
    measurementId: "G-RSL9H8YF5C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
