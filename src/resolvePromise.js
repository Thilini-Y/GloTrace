import { mapError } from "./errorHandling";
export function resolvePromise(promise, promiseState) {
    promiseState.promise = promise;
    promiseState.data = null;
    promiseState.error = null;

    if (!promise) return;

    function dataACB(result) {
        if (promiseState.promise === promise){
            promiseState.data = result;
        }
    }

    function errorACB(error) {
        if (promiseState.promise === promise){
            promiseState.error = mapError(error);
        }
    }

    function finallyACB() {
        if (promiseState.promise === promise){
            promiseState.promise = null;
        }
    }

    promise.then(dataACB).catch(errorACB).finally(finallyACB);
}