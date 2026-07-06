import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, deleteDoc, setDoc, updateDoc, getDoc, collection, addDoc, serverTimestamp, arrayUnion, arrayRemove, onSnapshot, query, where, getDocs, runTransaction } from "firebase/firestore";
import { generateShareCode } from "../utilities/shareUtils.js";
import { resolvePromise } from "../resolvePromise.js";

export function connectToPersistence(model, watchFunction) {

    function getUserDoc(user) {
        if (!user?.uid) return null;
        return doc(db, "users", user.uid);
    }

    let lastSavedTrip = null;

    function serializeTrip(trip) {
        return JSON.stringify({
            name: trip.name,
            startDate: trip.startDate,
            endDate: trip.endDate,
            tbd: trip.tbd,
            days: trip.days,
            shareCode: trip.shareCode || null,
            isShared:  trip.isShared  || false,
            photoURL:  trip.photoURL  || null,
        });
    }

    function authACB(user) {

        model.userModel.ready = false;

        function readFromFirestoreACB(snapshot) {
            const data = snapshot.data();

            model.userModel.profile.name = data?.name || user.displayName || "";
            model.userModel.profile.bio = data?.bio || "";
            model.userModel.profile.photoURL = data?.photoURL !== undefined ? data.photoURL : user.photoURL || "";
            model.userModel.tripSummaries = data?.tripSummaries || [];

            lastSaved = {
                name:     model.userModel.profile.name,
                bio:      model.userModel.profile.bio,
                photoURL: model.userModel.profile.photoURL,
            };

            model.userModel.ready = true;
        }

        function firestoreErrorACB(error) {
            console.error(error);
            model.userModel.ready = true;
        }

        if (user) {
            model.userModel.user = user;

            if (userUnsubscribe) {
                userUnsubscribe();
            }

            const modelDoc = getUserDoc(user);
            userUnsubscribe = onSnapshot(modelDoc, readFromFirestoreACB, firestoreErrorACB);
        } else {
            if (userUnsubscribe) {
                userUnsubscribe();
                userUnsubscribe = null;
            }
            model.userModel.user = null;
            model.userModel.promiseState.promise = null;
            model.userModel.promiseState.error = null;
            model.tripModel.activeTrip = null;
            model.tripModel.currentTripId = null;
            model.userModel.tripSummaries = [];
            lastSavedTrip = null;
            model.userModel.ready = true;
        }
    }

    onAuthStateChanged(auth, authACB);

    function checkChangeACB() {
        return [
            model.userModel.profile.name,
            model.userModel.profile.bio,
            model.userModel.profile.photoURL
        ];
    }

    let lastSaved = {
        name: null,
        bio: null,
        photoURL: null
    };

    function firestoreSideEffectACB() {
        if (!model.userModel.ready) return;

        const user = model.userModel.user;
        if (!user) return;

        const profile = model.userModel.profile;

        if (
            lastSaved.name === profile.name &&
            lastSaved.bio === profile.bio &&
            lastSaved.photoURL === profile.photoURL
        ) {
            return;
        }

        const dataToSave = {
            name: profile.name,
            bio: profile.bio,
            photoURL: profile.photoURL
        };

        lastSaved = dataToSave;
        const modelDoc = getUserDoc(user);
        setDoc(modelDoc, dataToSave, { merge: true });
    }

    watchFunction(checkChangeACB, firestoreSideEffectACB);

    async function deleteTrip(tripId) {
        const user = model.userModel.user;
        if (!user) throw new Error('Cannot delete trip without authenticated user');
        if (!tripId) throw new Error('Missing trip id for deleteTrip');

        if (currentSyncTripId === tripId && tripSyncUnsubscribe) {
            tripSyncUnsubscribe();
            tripSyncUnsubscribe = null;
            currentSyncTripId = null;
        }

        const tripDocRef = doc(db, 'trips', tripId);
        const tripDoc = await getDoc(tripDocRef);
        if (!tripDoc.exists()) return;

        const tripData = tripDoc.data();
        const explicitOwnerUid = tripData.ownerUid ?? null;
        const assumedOwnerUid = explicitOwnerUid || ((Array.isArray(tripData.members) && tripData.members.length > 0) ? tripData.members[0] : null);
        const isOwner = assumedOwnerUid === user.uid;

        async function removeTripFromUser(uid) {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) return;

            if (uid === user.uid && model.userModel.tripSummaries.some(s => s.id === tripId)) {
                return;
            }

            const data = userDoc.data();
            const remainingSummaries = (data.tripSummaries || []).filter(s => s.id !== tripId);
            const remainingTripIds   = (data.tripIds        || []).filter(id => id !== tripId);
            await updateDoc(userDocRef, {
                tripSummaries: remainingSummaries,
                tripIds:       remainingTripIds,
            });

            if (uid === user.uid) {
                model.userModel.tripSummaries = remainingSummaries;
            }
        }

        if (isOwner) {
            if (!tripData.ownerUid && assumedOwnerUid) {
                await updateDoc(tripDocRef, {
                    ownerUid: assumedOwnerUid,
                });
            }

            await deleteDoc(tripDocRef);

            const memberIds = Array.isArray(tripData.members) ? [...new Set(tripData.members)] : [];
            await Promise.all(memberIds.map(uid => removeTripFromUser(uid)));
        } else {
            const userDocRef = doc(db, 'users', user.uid);
            try {
                const result = await runTransaction(db, async (transaction) => {
                    const tripSnapshot = await transaction.get(tripDocRef);
                    if (!tripSnapshot.exists()) {
                        throw new Error('Trip no longer exists');
                    }

                    const userSnapshot = await transaction.get(userDocRef);
                    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
                    const remainingSummaries = (userData.tripSummaries || []).filter(s => s.id !== tripId);
                    const remainingTripIds   = (userData.tripIds || []).filter(id => id !== tripId);

                    transaction.update(tripDocRef, {
                        members: arrayRemove(user.uid),
                    });
                    transaction.set(userDocRef, {
                        tripSummaries: remainingSummaries,
                        tripIds:       remainingTripIds,
                    }, { merge: true });

                    return { remainingSummaries };
                });

                model.userModel.tripSummaries = result.remainingSummaries;
            } catch (err) {
                console.warn('[firestoreModel] leave shared trip transaction failed, falling back to sequential update:', err);
                await updateDoc(tripDocRef, {
                    members: arrayRemove(user.uid),
                });
                await removeTripFromUser(user.uid);
            }
        }

        if (model.tripModel.currentTripId === tripId) {
            model.tripModel.activeTrip = null;
            model.tripModel.currentTripId = null;
        }
    }

    function checkTripDeleteACB() {
        return model.tripModel.tripToDelete;
    }

    function tripDeleteSideEffectACB() {
        const tripId = model.tripModel.tripToDelete;
        if (!tripId) return;
        deleteTrip(tripId).then(() => {
            model.tripModel.tripToDelete = null;
        }).catch(() => {
            model.tripModel.tripToDelete = null;
        });
    }

    watchFunction(checkTripDeleteACB, tripDeleteSideEffectACB);

    function checkCurrentTripIdACB() {
        return model.tripModel.currentTripId;
    }

    function loadActiveTripACB() {
        const tripId = model.tripModel.currentTripId;
        if (!tripId) {
            lastSavedTrip = null;
            return;
        }
        if (model.tripModel.tripToDelete === tripId) return;
        const user = model.userModel.user;
        if (!user) return;

        if (tripSyncUnsubscribe && currentSyncTripId === tripId && model.tripModel.activeTrip?.id === tripId) return;

        getDoc(doc(db, 'trips', tripId)).then(function tripFetchedACB(snapshot) {
            if (!snapshot.exists()) return;
            if (model.tripModel.currentTripId !== tripId) return;
            if (model.tripModel.tripToDelete === tripId) return;
            const trip = { ...snapshot.data(), id: snapshot.id };
            if (!trip.ownerUid && Array.isArray(trip.members) && trip.members[0] === user.uid) {
                trip.ownerUid = user.uid;
                updateDoc(doc(db, 'trips', trip.id), { ownerUid: user.uid }).catch(() => {});
            }
            model.tripModel.activeTrip = trip;
            lastSavedTrip = serializeTrip(trip);
            // Only show share controls for the trip owner.
            const isOwner = trip.ownerUid === user.uid;
            if (trip.isShared && isOwner) {
                model.tripModel.currentShareCode = trip.shareCode || null;
                model.tripModel.currentIsShared  = true;
            } else {
                model.tripModel.currentShareCode = null;
                model.tripModel.currentIsShared  = false;
            }
            // Start real-time sync for shared trips so all members detect owner deletion.
            if (trip.isShared && !(tripSyncUnsubscribe && currentSyncTripId === tripId)) {
                model.tripModel.startTripSync(tripId);
            }
        }).catch(() => {});
    }

    watchFunction(checkCurrentTripIdACB, loadActiveTripACB);

    function checkTripChangeACB() {
        return model.searchModel.tripToSave;
    }

    function tripSideEffectACB() {
        const trip = model.searchModel.tripToSave;
        if (!trip) return;

        const user = model.userModel.user;
        if (!user) return;

        const serializedDays = {};
        for (const [date, spots] of Object.entries(trip.days || {})) {
            serializedDays[date] = spots.map(s => ({ ...s }));
        }

        let promise;
        if (trip.id) {
            const tripUpdate = {
                name:      trip.name,
                startDate: trip.startDate || null,
                endDate:   trip.endDate   || null,
                tbd:       (trip.tbd || []).map(s => ({ ...s })),
                days:      serializedDays,
                photoURL:  trip.photoURL  || null,
                shareCode: trip.shareCode ?? model.tripModel.currentShareCode ?? null,
                isShared:  typeof trip.isShared === 'boolean' ? trip.isShared : model.tripModel.currentIsShared || false,
            };
            if (trip.ownerUid) {
                tripUpdate.ownerUid = trip.ownerUid;
            }
            if (Array.isArray(trip.members)) {
                tripUpdate.members = [...trip.members];
            }

            promise = updateDoc(doc(db, 'trips', trip.id), tripUpdate);
        } else {
            promise = addDoc(collection(db, 'trips'), {
                ownerUid:  user.uid,
                members:   [user.uid],
                name:      trip.name,
                startDate: trip.startDate || null,
                endDate:   trip.endDate   || null,
                createdAt: serverTimestamp(),
                tbd:       (trip.tbd || []).map(s => ({ ...s })),
                days:      serializedDays,
                photoURL:  trip.photoURL  || null,
            });
        }

        model.searchModel.savePromiseState.promise = promise;
        model.searchModel.savePromiseState.error   = null;

        promise
            .then(ref => {
                const firestoreId = trip.id || ref.id;
                const isNewTrip = !trip.id;
                const newTrip = {
                    ...trip,
                    id: firestoreId,
                    ...(isNewTrip && { ownerUid: user.uid, members: [user.uid] }),
                };

                lastSavedTrip = serializeTrip(newTrip);
                model.tripModel.activeTrip = newTrip;

                const summary = {
                    id:        firestoreId,
                    name:      trip.name      || '',
                    startDate: trip.startDate || null,
                    endDate:   trip.endDate   || null,
                    photoURL:  trip.photoURL  || null,
                    isShared:  typeof trip.isShared === 'boolean' ? trip.isShared : model.tripModel.currentIsShared || false,
                };
                const existingIdx = model.userModel.tripSummaries.findIndex(s => s.id === firestoreId);
                if (existingIdx >= 0) {
                    const newSummaries = [...model.userModel.tripSummaries];
                    newSummaries[existingIdx] = summary;
                    model.userModel.tripSummaries = newSummaries;
                } else {
                    model.userModel.tripSummaries = [...model.userModel.tripSummaries, summary];
                }

                setDoc(doc(db, 'users', user.uid), {
                    tripSummaries: model.userModel.tripSummaries,
                }, { merge: true });

                model.searchModel.lastSavedTripId = firestoreId;
                model.searchModel.savePromiseState.promise = null;
                model.searchModel.tripToSave = null;
            })
            .catch(err => {
                console.error('[firestoreModel] Save failed:', err);
                model.searchModel.savePromiseState.error   = err;
                model.searchModel.savePromiseState.promise = null;
            });
    }

    watchFunction(checkTripChangeACB, tripSideEffectACB);

    function checkActiveTripACB() {
        return model.tripModel.activeTrip;
    }

    function activeTripSideEffectACB() {
        if (!model.userModel.ready) return;
        const user = model.userModel.user;
        if (!user) return;

        const trip = model.tripModel.activeTrip;
        if (!trip?.id) return;
        if (model.tripModel.tripToDelete === trip.id) return;

        const serialized = serializeTrip(trip);
        if (lastSavedTrip === serialized) return;

        lastSavedTrip = serialized;

        const serializedDays = {};
        for (const [date, spots] of Object.entries(trip.days || {})) {
            serializedDays[date] = spots.map(s => ({ ...s }));
        }
        const shareCode = trip.shareCode ?? model.tripModel.currentShareCode ?? null;
        const isShared = typeof trip.isShared === 'boolean'
            ? trip.isShared
            : model.tripModel.currentIsShared || false;

        updateDoc(doc(db, 'trips', trip.id), {
            name:      trip.name,
            startDate: trip.startDate || null,
            endDate:   trip.endDate   || null,
            tbd:       (trip.tbd || []).map(s => ({ ...s })),
            days:      serializedDays,
            shareCode,
            isShared,
            members:   trip.members || [],
            photoURL:  trip.photoURL || null,
        });

        const summaryIdx = model.userModel.tripSummaries.findIndex(s => s.id === trip.id);
        if (summaryIdx >= 0) {
            const old = model.userModel.tripSummaries[summaryIdx];
            const photoURL = trip.photoURL || null;
            const isShared = trip.isShared || false;
        if (
                old.name      !== trip.name      ||
                old.startDate !== (trip.startDate || null) ||
                old.endDate   !== (trip.endDate   || null) ||
                old.photoURL  !== photoURL        ||
                (old.isShared || false) !== isShared
            ) {
                const updated = {
                    id:        trip.id,
                    name:      trip.name      || '',
                    startDate: trip.startDate || null,
                    endDate:   trip.endDate   || null,
                    photoURL,
                    isShared,
                };
                const newSummaries = [...model.userModel.tripSummaries];
                newSummaries[summaryIdx] = updated;
                model.userModel.tripSummaries = newSummaries;

                setDoc(doc(db, 'users', user.uid), {
                    tripSummaries: newSummaries,
                }, { merge: true });

                const members = trip.members || [];
                members.forEach(memberUid => {
                    if (memberUid === user.uid) return; // already updated above
                    getDoc(doc(db, 'users', memberUid)).then(memberSnap => {
                        if (!memberSnap.exists()) return;
                        const memberSummaries = memberSnap.data().tripSummaries || [];
                        const memberIdx = memberSummaries.findIndex(s => s.id === trip.id);
                        if (memberIdx < 0) return;
                        const updatedMemberSummaries = [...memberSummaries];
                        updatedMemberSummaries[memberIdx] = updated;
                        setDoc(doc(db, 'users', memberUid), {
                            tripSummaries: updatedMemberSummaries,
                        }, { merge: true });
                    });
                });
            }
        }
    }

    watchFunction(checkActiveTripACB, activeTripSideEffectACB, { deep: true });


    function checkShareEnableACB() {
        return model.tripModel.shareToEnable;
    }

    function shareEnableSideEffectACB() {
        const tripId = model.tripModel.shareToEnable;
        if (!tripId) return;

        const user = model.userModel.user;
        if (!user) return;

        const shareCode = generateShareCode();

        updateDoc(doc(db, 'trips', tripId), {
            shareCode,
            isShared: true,
            members:  arrayUnion(user.uid),
        })
        .then(() => {
            model.tripModel.applyShareCode(shareCode);
            const updatedSummaries = model.userModel.tripSummaries.map(summary =>
                summary.id === tripId ? { ...summary, isShared: true } : summary
            );
            model.userModel.tripSummaries = updatedSummaries;
            setDoc(doc(db, 'users', user.uid), {
                tripSummaries: updatedSummaries,
            }, { merge: true });
            model.tripModel.shareToEnable = null;  
            model.tripModel.startTripSync(tripId);
        })
        .catch(err => {
            console.error('[firestoreModel] enableSharing failed:', err);
            model.tripModel.sharePromiseState.error = err;
            model.tripModel.shareToEnable = null;
        });
    }

    watchFunction(checkShareEnableACB, shareEnableSideEffectACB);


    function checkShareDisableACB() {
        return model.tripModel.shareToDisable;
    }

    function shareDisableSideEffectACB() {
        const tripId = model.tripModel.shareToDisable;
        if (!tripId) return;

        const user = model.userModel.user;
        if (!user) return;

        updateDoc(doc(db, 'trips', tripId), {
            shareCode: null,
            isShared:  false,
        })
        .then(() => {
            model.tripModel.clearShareCode();
            const updatedSummaries = model.userModel.tripSummaries.map(summary =>
                summary.id === tripId ? { ...summary, isShared: false } : summary
            );
            model.userModel.tripSummaries = updatedSummaries;
            setDoc(doc(db, 'users', user.uid), {
                tripSummaries: updatedSummaries,
            }, { merge: true });
            model.tripModel.shareToDisable = null;
            if (tripSyncUnsubscribe) { tripSyncUnsubscribe(); tripSyncUnsubscribe = null; }
        })
        .catch(err => {
            console.error('[firestoreModel] disableSharing failed:', err);
            model.tripModel.shareToDisable = null;
        });
    }

    watchFunction(checkShareDisableACB, shareDisableSideEffectACB);


    function checkTripJoinACB() {
        return model.tripModel.tripToJoin;
    }

    function tripJoinSideEffectACB() {
        const payload = model.tripModel.tripToJoin;
        if (!payload) return;

        const user = model.userModel.user;
        if (!user) return;

        const { tripId, summary } = payload;
        model.tripModel.tripToJoin = null;  

        const alreadyInModel = model.userModel.tripSummaries.some(s => s.id === summary.id);
        if (!alreadyInModel) {
            model.userModel.tripSummaries = [...model.userModel.tripSummaries, summary];
        }

        updateDoc(doc(db, 'trips', tripId), {
            members: arrayUnion(user.uid),
        })
        .then(() => {
            if (!model.userModel.tripSummaries.some(s => s.id === summary.id)) {
                model.userModel.tripSummaries = [...model.userModel.tripSummaries, summary];
            }
            return setDoc(doc(db, 'users', user.uid), { tripSummaries: model.userModel.tripSummaries }, { merge: true });
        })
        .then(() => {
            model.tripModel.startTripSync(tripId);
            model.tripModel.lastJoinedTripId = tripId;
        })
        .catch(err => {
            console.error('[firestoreModel] joinSharedTrip failed:', err);
            if (!alreadyInModel) {
                model.userModel.tripSummaries = model.userModel.tripSummaries.filter(s => s.id !== summary.id);
            }
            model.tripModel.sharedTripError = err.message;
        });
    }

    watchFunction(checkTripJoinACB, tripJoinSideEffectACB);


    function checkTripCloneACB() {
        return model.tripModel.tripToClone;
    }

    function tripCloneSideEffectACB() {
        const tripData = model.tripModel.tripToClone;
        if (!tripData) return;

        const user = model.userModel.user;
        if (!user) return;

        model.tripModel.tripToClone = null;

        const serializedDays = {};
        for (const [date, spots] of Object.entries(tripData.days || {})) {
            serializedDays[date] = spots.map(s => ({ ...s }));
        }

        const newTripDoc = {
            ownerUid:  user.uid,
            members:   [user.uid],
            name:      tripData.name,
            startDate: tripData.startDate || null,
            endDate:   tripData.endDate   || null,
            createdAt: serverTimestamp(),
            tbd:       (tripData.tbd || []).map(s => ({ ...s })),
            days:      serializedDays,
            photoURL:  tripData.photoURL  || null,
            shareCode: null,
            isShared:  false,
        };

        addDoc(collection(db, 'trips'), newTripDoc)
            .then(ref => {
                const newTripId = ref.id;
                const summary = {
                    id:        newTripId,
                    name:      newTripDoc.name      || '',
                    startDate: newTripDoc.startDate || null,
                    endDate:   newTripDoc.endDate   || null,
                    photoURL:  newTripDoc.photoURL  || null,
                    isShared:  false,
                };
                const alreadyPresent = model.userModel.tripSummaries.some(s => s.id === newTripId);
                const newSummaries = alreadyPresent
                    ? model.userModel.tripSummaries
                    : [...model.userModel.tripSummaries, summary];
                model.userModel.tripSummaries = newSummaries;
                return setDoc(doc(db, 'users', user.uid), { tripSummaries: newSummaries }, { merge: true })
                    .then(() => {
                        model.tripModel.currentShareCode = null;
                        model.tripModel.currentIsShared  = false;
                        model.tripModel.activeTrip    = { ...newTripDoc, id: newTripId };
                        model.tripModel.currentTripId = newTripId;
                        model.tripModel.lastClonedTripId = newTripId;  // signal presenter to navigate
                    });
            })
            .catch(err => {
                console.error('[firestoreModel] cloneTrip failed:', err);
                model.tripModel.sharedTripError = err.message;
            });
    }

    watchFunction(checkTripCloneACB, tripCloneSideEffectACB);


    function checkShareCodeLookupACB() {
        return model.tripModel.shareCodeToLookup;
    }

    function shareCodeLookupSideEffectACB() {
        const shareCode = model.tripModel.shareCodeToLookup;
        if (!shareCode) return;

        const q = query(
            collection(db, 'trips'),
            where('shareCode', '==', shareCode),
            where('isShared', '==', true)
        );

        const promise = getDocs(q, { source: 'server' })
            .then(snap => {
                if (snap.empty) {
                    model.tripModel.sharedTripError  = 'This share link is no longer active.';
                    model.tripModel.sharedTripResult = null;
                } else {
                    const docSnap = snap.docs[0];
                    model.tripModel.sharedTripResult = { id: docSnap.id, ...docSnap.data() };
                    model.tripModel.sharedTripError  = null;
                }
                model.tripModel.shareCodeToLookup = null;
            })
            .catch(err => {
                model.tripModel.sharedTripError   = err.message;
                model.tripModel.sharedTripResult  = null;
                model.tripModel.shareCodeToLookup = null;
            });

        resolvePromise(promise, model.tripModel.lookupPromiseState);
    }

    watchFunction(checkShareCodeLookupACB, shareCodeLookupSideEffectACB);

    let tripSyncUnsubscribe = null;
    let currentSyncTripId = null;
    let userUnsubscribe = null;

    function checkTripToSyncACB() {
        return model.tripModel.tripToSync;
    }

    function tripSyncSideEffectACB() {
        const tripId = model.tripModel.tripToSync;
        if (!tripId) return;

        if (tripSyncUnsubscribe) {
            tripSyncUnsubscribe();
            tripSyncUnsubscribe = null;
            currentSyncTripId = null;
        }

        currentSyncTripId = tripId;
        tripSyncUnsubscribe = onSnapshot(
            doc(db, 'trips', tripId),
            (snap) => {
                if (!snap.exists()) {
                    if (tripSyncUnsubscribe) {
                        tripSyncUnsubscribe();
                        tripSyncUnsubscribe = null;
                        currentSyncTripId = null;
                    }
                    const remainingSummaries = (model.userModel.tripSummaries || []).filter(s => s.id !== tripId);
                    model.userModel.tripSummaries = remainingSummaries;
                    const snapUser = model.userModel.user;
                    if (snapUser) {
                        updateDoc(doc(db, 'users', snapUser.uid), {
                            tripSummaries: remainingSummaries,
                        }).catch(() => {});
                    }
                    
                    const deletedTrip = model.tripModel.activeTrip;
                    const isOwner = deletedTrip?.ownerUid === snapUser?.uid;
                    if (!isOwner && deletedTrip?.name) {
                        model.tripModel.deletedTripNotification = { name: deletedTrip.name };
                    }
                    model.tripModel.activeTrip = null;
                    model.tripModel.currentTripId = null;
                    model.tripModel.syncDeletedTripId = tripId;
                    
                    return;
                }

                model.tripModel.activeTrip = {
                    ...model.tripModel.activeTrip,
                    ...snap.data(),
                    id: snap.id,
                };
                lastSavedTrip = serializeTrip(model.tripModel.activeTrip);

            },
            (err) => {
                if (err?.code !== 'permission-denied') {
                    console.error('[firestoreModel] onSnapshot error:', err);
                }

                if (tripSyncUnsubscribe) {
                    tripSyncUnsubscribe();
                    tripSyncUnsubscribe = null;
                    currentSyncTripId = null;
                }

                const remainingSummaries = (model.userModel.tripSummaries || []).filter(s => s.id !== tripId);
                model.userModel.tripSummaries = remainingSummaries;

                const user = model.userModel.user;
                if (user) {
                    updateDoc(doc(db, 'users', user.uid), {
                        tripSummaries: remainingSummaries,
                    }).catch(() => {});
                }

                const deletedTrip = model.tripModel.activeTrip;
                const isOwner = deletedTrip?.ownerUid === user?.uid;
                if (!isOwner && deletedTrip?.name) {
                    model.tripModel.deletedTripNotification = { name: deletedTrip.name };
                }

                model.tripModel.activeTrip = null;
                model.tripModel.currentTripId = null;
                model.tripModel.syncDeletedTripId = tripId;
            }
        );

        model.tripModel.tripToSync = null;
    }

    watchFunction(checkTripToSyncACB, tripSyncSideEffectACB);
}
