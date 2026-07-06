export function createSpotNode(location_id, { placeId = null, lat = null, lng = null, spotData = null } = {}) {
    return {
        location_id,
        placeId,
        lat,
        lng,
        spotData,
        note: "",
        budget: null,
        startTime: null,
        endTime: null,
        transportToNext: null,
    };
}

export function createTrip(name, startDate, endDate, spots = [], ownerUid = null) {
    return {
        name,
        startDate,
        endDate,
        ownerUid,
        members:   ownerUid ? [ownerUid] : [],
        tbd: spots,
        days: {},
        shareCode: null,
        isShared:  false,
    };
}

const transportCache = {};

function transportKey(originlocation_id, destlocation_id) {
    return `${originlocation_id}_${destlocation_id}`;
}

function getDatesInRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export function getCachedTransport(originlocation_id, destlocation_id) {
    return transportCache[transportKey(originlocation_id, destlocation_id)] || null;
}

export function setCachedTransport(originlocation_id, destlocation_id, routeData) {
    transportCache[transportKey(originlocation_id, destlocation_id)] = routeData;
}


export const tripModel = {
    activeTrip: null,
    currentTripId: null,
    currentlocation_id: null,
    tripToDelete: null,

    searchParams: {},
    searchResultsPromiseState: {},
    currentSpotPromiseState: {},

    sharePromiseState:  { promise: null, data: null, error: null },
    shareToEnable:      null,
    shareToDisable:     null,
    tripToJoin:         null,
    tripToClone:        null,
    tripToDelete:       null,

    lastJoinedTripId:   null,
    lastClonedTripId:   null,

    currentShareCode:   null,
    currentIsShared:    false,

    shareCodeToLookup:   null,
    sharedTripResult:    null,
    sharedTripError:     null,
    lookupPromiseState:  { promise: null, data: null, error: null },

    tripToSync:         null,
    syncDeletedTripId:  null,
    redirectToTrips: false,

    onTripDeleted:      null,

    deletedTripNotification: null,


    setCurrentTripId(tripId) {
        if (this.currentTripId !== tripId) {
            this.currentTripId = tripId;
            if (!this.activeTrip || this.activeTrip.id !== tripId) {
                this.activeTrip = null;
            }
            this.currentShareCode = null;
            this.currentIsShared  = false;
        }
    },

    changeActiveTripToNull() {
        this.currentTripId = null;
        this.activeTrip = null;
    },

    getCurrentTrip() {
        return this.activeTrip;
    },

    setTripToDelete(id) {
        this.tripToDelete = id;
    },

    clearLastJoinedTripId() {
        this.lastJoinedTripId = null;
    },

    clearLastClonedTripId() {
        this.lastClonedTripId = null;
    },

    setCurrentlocation_id(location_id) {
        this.currentlocation_id = location_id;
    },

    addSpotToTBD(tripId, location_id, opts) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const node = createSpotNode(location_id, opts);
        const t = this.activeTrip;
        this.activeTrip = { ...t, tbd: [...t.tbd, node] };
    },

    addSpotToDay(tripId, date, location_id, opts) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const node = createSpotNode(location_id, opts);
        const t = this.activeTrip;
        const daySpots = [...(t.days[date] || [])];
        daySpots.push(node);
        this.activeTrip = { ...t, days: { ...t.days, [date]: daySpots } };
    },

    removeSpot(tripId, container, index) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const t = this.activeTrip;
        if (container.type === "tbd") {
            const newTbd = [...t.tbd];
            newTbd.splice(index, 1);
            this.activeTrip = { ...t, tbd: newTbd };
            return;
        }
        const newSpots = [...(t.days[container.date] || [])];
        newSpots.splice(index, 1);
        if (newSpots.length > 0) {
            newSpots[newSpots.length - 1] = {
                ...newSpots[newSpots.length - 1],
                transportToNext: null,
            };
        }
        this.activeTrip = { ...t, days: { ...t.days, [container.date]: newSpots } };
    },

    moveSpot(tripId, sourceContainer, sourceIndex, targetContainer, targetIndex = -1) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const t = this.activeTrip;

        let srcList =
            sourceContainer.type === "tbd"
                ? [...t.tbd]
                : [...(t.days[sourceContainer.date] || [])];
        let tgtList =
            sourceContainer.type === targetContainer.type &&
            sourceContainer.date === targetContainer.date
                ? srcList  // same list
                : targetContainer.type === "tbd"
                    ? [...t.tbd]
                    : [...(t.days[targetContainer.date] || [])];

        const [node] = srcList.splice(sourceIndex, 1);
        const movedNode = { ...node, transportToNext: null };

        if (targetIndex >= 0) tgtList.splice(targetIndex, 0, movedNode);
        else tgtList.push(movedNode);

        if (srcList.length > 0) {
            srcList[srcList.length - 1] = {
                ...srcList[srcList.length - 1],
                transportToNext: null,
            };
        }
        if (tgtList.length > 0) {
            tgtList[tgtList.length - 1] = {
                ...tgtList[tgtList.length - 1],
                transportToNext: null,
            };
        }

        let newTbd = t.tbd;
        const newDays = { ...t.days };

        if (sourceContainer.type === "tbd") newTbd = srcList;
        else newDays[sourceContainer.date] = srcList;

        if (targetContainer.type === "tbd") newTbd = tgtList;
        else newDays[targetContainer.date] = tgtList;

        this.activeTrip = { ...t, tbd: newTbd, days: newDays };
    },

    reorderSpots(tripId, container, fromIndex, toIndex) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const t = this.activeTrip;

        const arr =
            container.type === "tbd"
                ? [...t.tbd]
                : [...(t.days[container.date] || [])];

        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, { ...moved, transportToNext: null });

        if (arr.length > 0) {
            arr[arr.length - 1] = {
                ...arr[arr.length - 1],
                transportToNext: null,
            };
        }

        if (container.type === "tbd") {
            this.activeTrip = { ...t, tbd: arr };
        } else {
            this.activeTrip = { ...t, days: { ...t.days, [container.date]: arr } };
        }
    },


    updateSpot(container, index, updates) {
        const t = this.activeTrip;

        if (container.type === "tbd") {
            const newTbd = [...t.tbd];
            newTbd[index] = { ...newTbd[index], ...updates };
            this.activeTrip = { ...t, tbd: newTbd };
            return;
        }
        const newSpots = [...(t.days[container.date] || [])];
        newSpots[index] = { ...newSpots[index], ...updates };
        this.activeTrip = { ...t, days: { ...t.days, [container.date]: newSpots } };
    },

    setTransportMode(tripId, date, index, mode, duration = null, distance = null, encodedPolyline = null) {
        if (!this.activeTrip || this.activeTrip.id !== tripId) return;
        const t = this.activeTrip;
        const newSpots = [...(t.days[date] || [])];
        if (index >= newSpots.length - 1) return; // last spot, no next
        newSpots[index] = {
            ...newSpots[index],
            transportToNext: mode
                ? { mode, destlocation_id: newSpots[index + 1]?.location_id ?? null, duration, distance, encodedPolyline }
                : null,
        };
        this.activeTrip = { ...t, days: { ...t.days, [date]: newSpots } };
    },

    changeTripDates(tripId, newStart, newEnd) {
        if (!this.activeTrip || this.activeTrip.id !== tripId || !newStart || !newEnd || newStart > newEnd) return;
        const t = this.activeTrip;
        const oldDates = this.getTripDates(tripId);
        const newDates = getDatesInRange(newStart, newEnd);
        const newDays = {};
        newDates.forEach(date => { newDays[date] = []; });

        const newTbd = [...(t.tbd ?? [])];
        oldDates.forEach((oldDate, index) => {
            const daySpots = t.days[oldDate] ?? [];
            if (index < newDates.length) {
                newDays[newDates[index]] = daySpots;
            } else {
                newTbd.push(...daySpots.map(spot => ({ ...spot, transportToNext: null })));
            }
        });

        this.activeTrip = { ...t, startDate: newStart, endDate: newEnd, tbd: newTbd, days: newDays };
    },

    addTripDate(tripId) {
        if (!this.activeTrip || this.activeTrip.id !== tripId || !this.activeTrip.endDate) return;
        const t = this.activeTrip;
        const date = new Date(t.endDate);
        date.setUTCDate(date.getUTCDate() + 1);
        const newEndDate = date.toISOString().slice(0, 10);
        this.activeTrip = { ...t, endDate: newEndDate, days: { ...t.days, [newEndDate]: [] } };
    },

    removeTripDate(tripId, date) {
        if (!this.activeTrip || this.activeTrip.id !== tripId || !date) return;
        const t = this.activeTrip;
        const dates = this.getTripDates(tripId);
        if (!dates.includes(date) || dates.length <= 1) return;

        const deletedSpots = (t.days[date] ?? []).map(spot => ({ ...spot, transportToNext: null }));
        const newTbd = [...(t.tbd ?? []), ...deletedSpots];
        const newDays = {};
        dates.forEach(day => {
            if (day === date) return;
            if (day < date) {
                newDays[day] = t.days[day] ?? [];
                return;
            }
            const shifted = new Date(day);
            shifted.setUTCDate(shifted.getUTCDate() - 1);
            newDays[shifted.toISOString().slice(0, 10)] = t.days[day] ?? [];
        });

        const endDate = new Date(t.endDate);
        endDate.setUTCDate(endDate.getUTCDate() - 1);
        this.activeTrip = {
            ...t,
            tbd: newTbd,
            days: newDays,
            endDate: endDate.toISOString().slice(0, 10),
        };
    },



    getTripDates(tripId) {
        const trip = this.activeTrip;
        if (!trip || trip.id !== tripId || !trip.startDate || !trip.endDate) return [];
        const dates = [];
        const current = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        while (current <= end) {
            dates.push(current.toISOString().slice(0, 10));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    },

    getDaySpots(tripId, date) {
        const trip = this.activeTrip;
        if (!trip || trip.id !== tripId) return [];
        return trip.days[date] || [];
    },

    getDayTransports(tripId, date) {
        const spots = this.getDaySpots(tripId, date);
        const result = [];
        for (let i = 0; i < spots.length - 1; i++) {
            const link = spots[i].transportToNext;
            result.push({
                mode: link?.mode || null,
                cached: link?.mode
                    ? getCachedTransport(spots[i].location_id, spots[i + 1].location_id, link.mode)
                    : null,
            });
        }
        return result;
    },

    lookupByShareCode(shareCode) {
        this.shareCodeToLookup = shareCode;
        this.sharedTripResult  = null;
        this.sharedTripError   = null;
    },

    startTripSync(tripId) {
        this.tripToSync = tripId;
    },

    joinTrip(tripId, summary) {
        this.sharedTripError = null;
        this.tripToJoin = { tripId, summary };
    },

    cloneTrip(tripData) {
        this.sharedTripError = null;
        this.tripToClone = tripData;
    },

    enableSharing(tripId) {
        this.shareToEnable = tripId;
    },

    disableSharing(tripId) {
        this.shareToDisable = tripId;
    },

    applyShareCode(shareCode) {
        if (!this.activeTrip) return;
        this.activeTrip = { ...this.activeTrip, shareCode, isShared: true, members: this.activeTrip.members ?? [] };
        this.currentShareCode = shareCode;
        this.currentIsShared  = true;
    },

    clearShareCode() {
        if (!this.activeTrip) return;
        this.activeTrip = { ...this.activeTrip, shareCode: null, isShared: false };
        //
        this.currentShareCode = null;
        this.currentIsShared  = false;
    },

    addMember(uid) {
        if (!this.activeTrip) return;
        const members = this.activeTrip.members ?? [];
        if (!members.includes(uid)) {
            this.activeTrip = { ...this.activeTrip, members: [...members, uid] };
        }
    },
};
