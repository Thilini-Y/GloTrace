import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { auth } from "./firebaseConfig";
import { resolvePromise } from "../resolvePromise"; 

export function signInOrSignUp(email, password, signup, promiseState) {
  const promise = signup
    ? createUserWithEmailAndPassword(auth, email, password)
    : signInWithEmailAndPassword(auth, email, password);

  resolvePromise(promise, promiseState);
  return promise;
}

export function logout(promiseState) {
  const promise = signOut(auth);
  resolvePromise(promise, promiseState);
  return promise;
}