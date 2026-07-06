import { searchLocations, getLocationDetails, getLocationPhotos } from '../utilities/tripAdvisorApi.js';
import { resolvePromise } from '../resolvePromise.js';
import { createTrip, createSpotNode } from './tripModel.js';

function uniqueSpotsByLocationId(spots) {
  const seen = new Set();
  return spots.filter(spot => {
    if (!spot?.location_id || seen.has(spot.location_id)) return false;
    seen.add(spot.location_id);
    return true;
  });
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

export const searchModel = {
  query:         '',
  category:      '',
  results:       [],
  selectedPlace: null,
  photos:        [],
  selectedSpots: [],
  spotPhotoMap:  {},
  arrivalDate:   '',
  departureDate: '',
  tripToSave:    null,
  lastSavedTripId: null,
  isEditingTrip: false,
  currentEditingTripId: null,
  originalTripName: '',
  originalTripPhotoURL: null,
  originalTripShareCode: null,
  originalTripIsShared: false,
  originalTripOwnerUid: null,
  originalTripMembers: [],
  originalTripTbd: [],
  originalTripDays: {},
  latestSearchPromise: null, //no clear

  promise: null,
  data:    null,
  error:   null,

  detailPromiseState: { promise: null, data: null, error: null },
  savePromiseState: { promise: null, data: null, error: null },
  addSpotPromiseState: { promise: null, data: null, error: null },

  loadPhotosForResultsAsync(data, currentPromise) {
    data.forEach(async (place, index) => {
      const delayBetweenCalls = index < 4 ? 500 : 800;
      setTimeout(async () => {
        //If the number plate in your hand is not the latest one, please exit immediately.
        if (this.latestSearchPromise !== currentPromise) return;
        try {
          const photos = await getLocationPhotos(place.location_id);
          // Prevent users from clicking on other categories during the await period.
          if (this.latestSearchPromise !== currentPromise) return;

          place.allPhotos = photos;
          if (photos.length > 0) {
            place.photo = place.photo || {};
            place.photo.images = place.photo.images || {};
            place.photo.images.large = place.photo.images.large || {};
            place.photo.images.large.url = photos[0].images?.large?.url || photos[0].images?.medium?.url;
          }

          const resultIndex = this.results.indexOf(place);
          if (resultIndex !== -1) {
            this.results.splice(resultIndex, 1, { ...place });
          }
        } catch (e) {
          console.warn(`Failed to load photos for ${place.name}:`, e);
        }
      }, index * delayBetweenCalls);
    });
  },

  doSearch(city, category = '') {
    this.query        = city;
    this.category     = category;
    this.error        = null;
    this.spotPhotoMap = {};
    
    // Every time a new search is initiated, a brand new number plate is issued 
    // ensuring uniqueness through the timestamp
    const currentPromise = searchLocations(city, category);

    this.latestSearchPromise = currentPromise;
    resolvePromise(currentPromise, this);
    currentPromise.then(data => {
      if (this.promise === currentPromise) { 
        this.results = data;
        this.loadPhotosForResultsAsync(data, currentPromise); 
      }
    }).catch(() => {
        if (this.promise === currentPromise) {
            this.error = "Something went wrong. Please try again.";
        }
    });
  },

  fetchPlaceDetail(place) {
    const id = place?.location_id;
    if (!id) return;
    this.selectedPlace = null;
    this.photos        = [];
    const currentPromise = Promise.all([
      getLocationDetails(id),
      Promise.resolve(place.allPhotos || getLocationPhotos(id, 5)),
    ]);

    resolvePromise(currentPromise, this.detailPromiseState);

    currentPromise.then(([detail, photos]) => {
      if (this.detailPromiseState.promise === currentPromise) {
        this.selectedPlace = detail;
        this.photos        = Array.isArray(photos) ? photos : (photos || []);
      }
    }).catch(() => {
      if (this.detailPromiseState.promise === currentPromise) {
        this.error = "Something went wrong. Please try again.";
      }
    });
  },

  addSpot(place) {
    if (this.selectedSpots.find(s => s.location_id === place.location_id)) return;

    const photoURL =
      place?.photo?.images?.large?.url ||
      place?.photo?.images?.medium?.url ||
      null;
    if (photoURL) this.spotPhotoMap[place.location_id] = photoURL;

    const currentPromise = getLocationDetails(place.location_id);
    
    resolvePromise(currentPromise, this.addSpotPromiseState);

    currentPromise.then(detail => {
      if (this.addSpotPromiseState.promise === currentPromise) {
        if (this.selectedSpots.find(s => s.location_id === place.location_id)) return;
        this.selectedSpots.push(createSpotNode(place.location_id, {
          lat: parseFloat(detail.latitude)  || null,
          lng: parseFloat(detail.longitude) || null,
          spotData: {
            name:        detail.name,
            category:    detail.subcategory?.[0]?.name ?? detail.category?.name ?? null,
            rating:      detail.rating      ?? null,
            address:     detail.address_obj?.address_string ?? null,
            description: detail.description ?? null,
            web_url:     detail.web_url     ?? null,
            phone:       detail.phone       ?? null,
            photo:       null,
          },
        }));
      }
    });
  },

  setQuery(q) {
    this.query = q;
  },

  setError(msg) {
    this.error = msg;
  },

  setArrivalDate(value) {
    this.arrivalDate = value;
    if (value && this.departureDate && value > this.departureDate) {
      this.departureDate = value;
    }
  },

  setDepartureDate(value) {
    this.departureDate = value;
    if (value && this.arrivalDate && value < this.arrivalDate) {
      this.arrivalDate = value;
    }
  },

  clearSearch() {
    this.query = '';
    this.results = [];
  },

  clearTripData() {
    this.selectedSpots = [];
    this.arrivalDate = '';
    this.departureDate = '';
    this.isEditingTrip = false;
    this.currentEditingTripId = null;
    this.originalTripName = '';
    this.originalTripPhotoURL = null;
    this.originalTripShareCode = null;
    this.originalTripIsShared = false;
    this.originalTripOwnerUid = null;
    this.originalTripMembers = [];
    this.originalTripTbd = [];
    this.originalTripDays = {};
    this.error = null;
    this.selectedPlace = null;
    this.photos = [];
  },

  clearLastSavedTripId() {
    this.lastSavedTripId = null;
  },

  removeSpot(location_id) {
    this.selectedSpots = this.selectedSpots.filter(s => s.location_id !== location_id);
  },

  startEditingTrip(currentTrip) {
    const cityMatch = currentTrip.name.match(/^Trip to (.+)$/);
    this.query = cityMatch ? cityMatch[1] : currentTrip.name;
    this.arrivalDate = currentTrip.startDate;
    this.departureDate = currentTrip.endDate;
    this.selectedSpots = uniqueSpotsByLocationId([
      ...currentTrip.tbd,
      ...Object.values(currentTrip.days).flat(),
    ]);
    this.isEditingTrip = true;
    this.currentEditingTripId = currentTrip.id;
    this.originalTripName = currentTrip.name;
    this.originalTripPhotoURL = currentTrip.photoURL;
    this.originalTripShareCode = currentTrip.shareCode || null;
    this.originalTripIsShared = currentTrip.isShared || false;
    this.originalTripOwnerUid = currentTrip.ownerUid || null;
    this.originalTripMembers = Array.isArray(currentTrip.members) ? [...currentTrip.members] : [];
    this.originalTripTbd = [...(currentTrip.tbd || [])];
    this.originalTripDays = { ...(currentTrip.days || {}) };
  },

  clearSelection() {
    this.selectedPlace = null;
    this.photos        = [];

    this.detailPromiseState.promise = null;
    this.detailPromiseState.data = null;
    this.detailPromiseState.error = null;
  },

  generatePlan() {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = this.arrivalDate || today;
    const endDate = this.departureDate || today;

    const photoURL = this.spotPhotoMap[this.selectedSpots[0]?.location_id] || null;

    if (this.isEditingTrip && this.currentEditingTripId) {
      const preservedPhotoURL = photoURL || this.originalTripPhotoURL || null;

      const existingIds = new Set([
        ...this.originalTripTbd,
        ...Object.values(this.originalTripDays).flat(),
      ].map(s => s.location_id));
      const selectedIds = new Set(this.selectedSpots.map(s => s.location_id));
      const keptOriginalTbd = this.originalTripTbd.filter(s => selectedIds.has(s.location_id));
      const oldDates = Object.keys(this.originalTripDays).sort();
      const newDates = getDatesInRange(startDate, endDate);
      const keptOriginalDays = {};
      newDates.forEach(date => { keptOriginalDays[date] = []; });
      oldDates.forEach((date, index) => {
        const spots = this.originalTripDays[date] || [];
        const keptSpots = spots.filter(s => selectedIds.has(s.location_id));
        if (index >= newDates.length) {
          keptOriginalTbd.push(...keptSpots.map(spot => ({ ...spot, transportToNext: null })));
          return;
        }
        const newDate = newDates[index];
        keptOriginalDays[newDate] = keptSpots.map((spot, spotIndex) => {
          const nextSpot = keptSpots[spotIndex + 1];
          if (spot.transportToNext?.destlocation_id !== nextSpot?.location_id) {
            return { ...spot, transportToNext: null };
          }
          return spot;
        });
      });
      const newSpots = this.selectedSpots.filter(s => !existingIds.has(s.location_id));

      this.tripToSave = {
        id: this.currentEditingTripId,
        name: this.originalTripName || `Trip to ${this.query}`,
        startDate,
        endDate,
        tbd: [...keptOriginalTbd, ...newSpots],
        days: keptOriginalDays,
        photoURL: preservedPhotoURL,
        shareCode: this.originalTripShareCode || null,
        isShared: this.originalTripIsShared || false,
        ownerUid: this.originalTripOwnerUid || null,
        members: [...this.originalTripMembers],
      };
    } else {
      const trip = createTrip(
        `Trip to ${this.query}`,
        startDate,
        endDate,
        [...this.selectedSpots]
      );
      trip.photoURL = photoURL;
      this.tripToSave = trip;
    }
  },
};
