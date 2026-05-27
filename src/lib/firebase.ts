import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDyfjvBPYLBn_x8y5u29J1z8iz63xCvicM",
  authDomain: "control-x-prod.firebaseapp.com",
  projectId: "control-x-prod",
  storageBucket: "control-x-prod.firebasestorage.app",
  messagingSenderId: "965478460447",
  appId: "1:965478460447:web:2cf560dce2886ad194392a"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
