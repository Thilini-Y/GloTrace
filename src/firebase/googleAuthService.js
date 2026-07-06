import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { mapError } from "../errorHandling";

export function signInWithGoogle(promiseState) {
  const provider = new GoogleAuthProvider();

  function successACB(result) {
    promiseState.promise = null;
    promiseState.error = null;
  }

  function errorACB(err) {
    promiseState.error = mapError(err);
    promiseState.promise = null;
  }

  const promise = signInWithPopup(auth, provider);

  promiseState.promise = promise;

  const timeoutId = setTimeout(() => {
    if (promiseState.promise === promise) {
      promiseState.promise = null;
    }
  }, 1000);

  promise
    .then((result) => {
      clearTimeout(timeoutId);
      successACB(result);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.code === "auth/popup-closed-by-user") {
        promiseState.promise = null;
        promiseState.error = null;
        return;
      }
      
      errorACB(err);
    });
}
