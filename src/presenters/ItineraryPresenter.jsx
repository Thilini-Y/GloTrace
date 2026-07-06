import { defineComponent, ref, watchEffect, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import ItineraryView, { buildPoiInfoWindowContent, getCategoryIcon, buildMarkerContent } from '../views/ItineraryView.jsx';
import {
    loadMapsLibrary, loadPlacesLibrary, loadGeometryLibrary, loadMarkerLibrary,
    getRouteByLatLng,
} from '../utilities/googleMapsApi';
import { getCachedTransport, setCachedTransport } from '../models/tripModel.js';
import { buildShareURL } from '../utilities/shareUtils.js';


const API_TO_MODE = { WALK: 'walk', BICYCLE: 'bike', TRANSIT: 'transit', DRIVE: 'drive' };
const MODE_TO_API = { walk: 'WALK', bike: 'BICYCLE', transit: 'TRANSIT', drive: 'DRIVE' };
const MODE_COLOR = { walk: '#34a853', bike: '#fbbc04', transit: '#4285f4', drive: '#ea4335' };

export default defineComponent({
    name: 'ItineraryPresenter',
    props: ['model', 'tripId'],
    setup(props) {
        const tripModel = props.model.tripModel;
        const router = useRouter();

        watchEffect(() => {
            if (tripModel.syncDeletedTripId !== props.tripId) {
                tripModel.setCurrentTripId(props.tripId);
            }
        });

        const selectedDate = ref(null);
        const transportModal = ref(null);

        const showDeleteConfirm = ref(false);

        const copied = ref(false);
        const sharePromiseState = computed(() => tripModel.sharePromiseState);
        const isShared = computed(() => tripModel.currentIsShared);
        const shareURL = computed(() => {
            const code = tripModel.currentShareCode;
            return code ? buildShareURL(code) : null;
        });

        onMounted(() => {
            if (tripModel.currentIsShared && props.tripId) {
                tripModel.startTripSync(props.tripId);
            }
        });

        onBeforeUnmount(() => {
            tripModel.changeActiveTripToNull();
        });

        watchEffect(() => {
            if (tripModel.currentTripId === null && props.tripId) {
                router.push('/trips');
            }
        });

        function onShareACB() {
            if (!props.tripId) return;
            tripModel.enableSharing(props.tripId);
            tripModel.startTripSync(props.tripId);
        }

        function onStopShareACB() {
            if (!props.tripId) return;
            tripModel.disableSharing(props.tripId);
        }

        async function onCopyShareACB() {
            if (!shareURL.value) return;
            await navigator.clipboard.writeText(shareURL.value);
            copied.value = true;
            setTimeout(() => (copied.value = false), 2000);
        }

        let mapInstance = null;
        let AdvancedMarkerElement = null;
        let geometryLib = null;
        const mapReady = ref(false);
        let dayMarkers = [];
        let dayPolylines = [];

        function clearMapOverlays() {
            dayMarkers.forEach(function removeMarkerACB(m) { m.map = null; });
            dayMarkers = [];
            dayPolylines.forEach(function removePolylineACB(p) { p.setMap(null); });
            dayPolylines = [];
        }

        function renderDayOnMap(spots) {
            clearMapOverlays();
            if (!mapInstance || !spots.length) return;

            spots.forEach(function renderMarkerACB(spot, index) {
                if (!spot.lat || !spot.lng) return;
                const icon = getCategoryIcon(spot.spotData?.category?.name + spot.spotData?.name);
                const marker = new AdvancedMarkerElement({
                    map: mapInstance,
                    position: { lat: spot.lat, lng: spot.lng },
                    content: buildMarkerContent(icon, index + 1),
                    title: spot.spotData?.name ?? '',
                });
                dayMarkers.push(marker);
            });

            for (let i = 0; i < spots.length - 1; i++) {
                const spot = spots[i];
                const transport = spot.transportToNext;
                if (!transport?.mode || !transport?.encodedPolyline) continue;

                const path = geometryLib.encoding.decodePath(transport.encodedPolyline);
                const polyline = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: MODE_COLOR[transport.mode] ?? '#888',
                    strokeOpacity: 0.85,
                    strokeWeight: 4,
                    map: mapInstance,
                });
                dayPolylines.push(polyline);
            }

            if (spots.length > 1) {
                const bounds = new google.maps.LatLngBounds();
                spots.forEach(function extendACB(s) {
                    if (s.lat && s.lng) bounds.extend({ lat: s.lat, lng: s.lng });
                });
                mapInstance.fitBounds(bounds, 60);
            } else if (spots[0]?.lat && spots[0]?.lng) {
                mapInstance.panTo({ lat: spots[0].lat, lng: spots[0].lng });
            }
        }

        watchEffect(() => {
            const date = selectedDate.value;
            const trip = tripModel.getCurrentTrip();
            if (!mapReady.value || !trip) {
                if (mapReady.value) clearMapOverlays();
                return;
            }
            if (date === null) {
                renderDayOnMap(trip.tbd ?? []);
            } else {
                renderDayOnMap(trip.days[date] ?? []);
            }
        });

        watchEffect(() => {
            if (!mapReady.value) return;
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;
            if (trip.mapCenter) {
                mapInstance.panTo(trip.mapCenter);
                return;
            }
            const allSpots = [...(trip.tbd ?? []), ...Object.values(trip.days ?? {}).flat()];
            const first = allSpots.find(s => s.lat && s.lng);
            if (first) mapInstance.panTo({ lat: first.lat, lng: first.lng });
        });

        function onMapReadyACB(mapContainer) {
            Promise.all([loadMapsLibrary(), loadPlacesLibrary(), loadGeometryLibrary(), loadMarkerLibrary()])
                .then(function initMapACB([mapsLib, placesLib, geoLib, markerLib]) {
                    geometryLib = geoLib;
                    AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
                    mapInstance = new mapsLib.Map(mapContainer, {
                        center: { lat: 59.3293, lng: 18.0686 },
                        zoom: 12,
                        mapId: "DEMO_MAP_ID",
                    });

                    const infoWindow = new mapsLib.InfoWindow({ maxWidth: Math.min(290, window.innerWidth - 24) });
                    const placesService = new placesLib.PlacesService(mapInstance);

                    mapInstance.addListener('click', function onMapClickACB(event) {
                        console.log('[POI] map click, placeId =', event.placeId);
                        if (!event.placeId) return;
                        event.stop();
                        placesService.getDetails(
                            { placeId: event.placeId, fields: ['name', 'geometry', 'formatted_address', 'rating', 'url'] },
                            function placeDetailsACB(place, status) {
                                console.log('[POI] getDetails status =', status, 'place =', place?.name);
                                if (status !== 'OK' || !place) return;
                                const poi = {
                                    name: place.name,
                                    address: place.formatted_address ?? '',
                                    rating: place.rating ?? null,
                                    placeId: event.placeId,
                                    lat: place.geometry.location.lat(),
                                    lng: place.geometry.location.lng(),
                                    mapsUrl: place.url ?? null,
                                };
                                const trip = tripModel.getCurrentTrip();
                                const dates = trip ? tripModel.getTripDates(trip.id) : [];
                                const content = buildPoiInfoWindowContent(poi, dates, function onAddACB(targetDay) {
                                    onAddPoiToTripACB(poi, targetDay);
                                    infoWindow.close();
                                });
                                infoWindow.setContent(content);
                                infoWindow.setPosition(place.geometry.location);
                                infoWindow.open(mapInstance);
                            }
                        );
                    });

                    mapReady.value = true; 
                })
                .catch(function mapInitErrorACB(err) {
                    console.error('[POI] map/places library load failed:', err);
                });
        }

        function onSelectDateACB(date) {
            selectedDate.value = date;
        }

        function onAddPoiToTripACB(poi, targetDay) {
            const trip = tripModel.getCurrentTrip();
            if (!trip || !poi) return;
            const opts = {
                placeId: poi.placeId,
                lat: poi.lat,
                lng: poi.lng,
                spotData: {
                    name: poi.name,
                    rating: poi.rating,
                    address_obj: { street1: poi.address },
                    photo: null,
                },
            };
            if (!targetDay || targetDay === 'tbd') {
                tripModel.addSpotToTBD(trip.id, poi.placeId, opts);
            } else {
                tripModel.addSpotToDay(trip.id, targetDay, poi.placeId, opts);
            }
        }

        function onChangeDatesACB(newStart, newEnd) {
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;

            tripModel.changeTripDates(trip.id, newStart, newEnd);
            const newDates = tripModel.getTripDates(trip.id);
            if (selectedDate.value && !newDates.includes(selectedDate.value)) {
                selectedDate.value = null;
            }
        }

        function onReorderACB(newList) {
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;
            if (selectedDate.value === null) {
                trip.tbd = newList;
            } else {
                newList.forEach((spot, index) => {
                    const nextSpot = newList[index + 1];
                    if (!nextSpot) return;
                    const transport = spot.transportToNext;
                    if (transport?.destlocation_id !== nextSpot.location_id) {
                        delete spot.transportToNext;
                    }
                });
                trip.days[selectedDate.value] = newList;
            }
        }

        function onTransportClickACB(spotIndex) {
            const trip = tripModel.getCurrentTrip();
            const spots = trip.days[selectedDate.value] ?? [];
            const spot = spots[spotIndex];
            const nextSpot = spots[spotIndex + 1];
            const cached = getCachedTransport(spot.location_id, nextSpot.location_id);
            if (cached) {
                transportModal.value = { spotIndex, loading: false, routes: cached };
                return;
            }
            transportModal.value = { spotIndex, loading: true, routes: null };

            getRouteByLatLng(spot.lat, spot.lng, nextSpot.lat, nextSpot.lng)
                .then(function routesReadyACB(routes) {
                    setCachedTransport(spot.location_id, nextSpot.location_id, routes);
                    if (transportModal.value?.spotIndex === spotIndex) {
                        transportModal.value = { spotIndex, loading: false, routes };
                    }
                });
        }

        function onTransportSelectACB(apiMode, duration) {
            const modal = transportModal.value;
            if (!modal) return;
            const trip = tripModel.getCurrentTrip();
            if (!trip || !selectedDate.value) return;
            const mode = API_TO_MODE[apiMode] ?? apiMode.toLowerCase();
            const route = modal.routes?.[apiMode];
            tripModel.setTransportMode(
                trip.id, selectedDate.value, modal.spotIndex, mode,
                duration ?? null,
                route?.distanceMeters ?? null,
                route?.encodedPolyline ?? null,
            );
            transportModal.value = null;
        }

        function onMoveSpotACB(spotIndex, targetDay) {
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;
            const from = selectedDate.value === null
                ? { type: 'tbd' }
                : { type: 'day', date: selectedDate.value };
            const to = targetDay === 'tbd'
                ? { type: 'tbd' }
                : { type: 'day', date: targetDay };
            tripModel.moveSpot(trip.id, from, spotIndex, to);
        }

        function onTransportCancelACB() {
            transportModal.value = null;
        }

        function onEditNameACB(newName) {
            const trip = tripModel.getCurrentTrip();
            trip.name = newName;
        }

        function onAddDateACB() {
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;
            tripModel.addTripDate(trip.id);
        }

        function onRemoveDateACB(date) {
            const trip = tripModel.getCurrentTrip();
            if (!trip || !date) return;

            tripModel.removeTripDate(trip.id, date);
            if (selectedDate.value >= date) selectedDate.value = null;
        }

        function onEditNoteACB(spotIndex, note) {
            const container = selectedDate.value === null ? { type: 'tbd' } : { type: 'day', date: selectedDate.value };
            tripModel.updateSpot(container, spotIndex, { note: note });
        }

        function onEditStartTimeACB(spotIndex, time) {
            const container = selectedDate.value === null ? { type: 'tbd' } : { type: 'day', date: selectedDate.value };
            tripModel.updateSpot(container, spotIndex, { startTime: time });
        }

        function onEditEndTimeACB(spotIndex, time) {
            const container = selectedDate.value === null ? { type: 'tbd' } : { type: 'day', date: selectedDate.value };
            tripModel.updateSpot(container, spotIndex, { endTime: time });
        }

        function onEditBudgetACB(spotIndex, amount, currency, purpose) {
            const container = selectedDate.value === null ? { type: 'tbd' } : { type: 'day', date: selectedDate.value };
            const budget = amount ? { amount: parseFloat(amount), currency: currency || 'USD', purpose: purpose || '' } : null;
            tripModel.updateSpot(container, spotIndex, { budget });
        }

        function onRemoveSpotACB(spotIndex) {
            const trip = tripModel.getCurrentTrip();
            if (!trip) return;
            const container = selectedDate.value === null ? { type: 'tbd' } : { type: 'day', date: selectedDate.value };
            tripModel.removeSpot(trip.id, container, spotIndex);
        }

        function onAddActivityACB() {
            //    router.push({ path: '/explore', query: { addToTrip: props.tripId } })
        }

        function onEditTripACB() {
            const search = props.model.searchModel;
            const currentTrip = tripModel.getCurrentTrip();
            if (currentTrip) {
                search.startEditingTrip(currentTrip);
                router.push(`/explore?city=${encodeURIComponent(search.query)}`);
            }
        }

        function onDeleteTripACB() {
            showDeleteConfirm.value = true;
        }

        function onDeleteCancelACB() {
            showDeleteConfirm.value = false;
        }

        async function onDeleteConfirmACB() {
            showDeleteConfirm.value = false;
            const currentTrip = tripModel.getCurrentTrip();
            if (!currentTrip?.id) return;
            const deletedId = currentTrip.id;
            props.model.userModel.removeTripSummary(deletedId);
            tripModel.setTripToDelete(deletedId);
            tripModel.changeActiveTripToNull();
            router.push('/trips');
        }

        return function renderACB() {
            const trip = tripModel.getCurrentTrip();
            const isOwner = !trip || trip.ownerUid === props.model.userModel.user?.uid;
            const dates = trip ? tripModel.getTripDates(trip.id) : [];
            const spots = !trip ? [] : (selectedDate.value === null ? trip.tbd : (trip.days[selectedDate.value] ?? []));

            let transportModalData = null;
            if (transportModal.value !== null) {
                const { spotIndex, loading, routes } = transportModal.value;
                transportModalData = {
                    fromName: spots[spotIndex]?.spotData?.name ?? 'Spot',
                    toName: spots[spotIndex + 1]?.spotData?.name ?? 'Next spot',
                    loading,
                    routes,
                };
            }

            const dayHeading = selectedDate.value
                ? (() => {
                    const d = new Date(selectedDate.value + 'T00:00:00');
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return `${label} · ${spots.length} stop${spots.length !== 1 ? 's' : ''}`;
                  })()
                : null;

            return (
                <ItineraryView
                                    trip={trip}
                                    spots={spots}
                                    dates={dates}
                                    selectedDate={selectedDate.value}
                                    dayHeading={dayHeading}
                                    mapCenter={tripModel.mapCenter}
                                    onSelectDate={onSelectDateACB}
                                    onEditName={onEditNameACB}
                                    onAddDate={onAddDateACB}
                                    onRemoveDate={onRemoveDateACB}
                                    onChangeDates={onChangeDatesACB}
                                    onReorder={onReorderACB}
                                    onMapReady={onMapReadyACB}
                                    transportModal={transportModalData}
                                    onTransportClick={onTransportClickACB}
                                    onTransportSelect={onTransportSelectACB}
                                    onTransportCancel={onTransportCancelACB}
                                    onMoveSpot={onMoveSpotACB}
                                    isOwner={isOwner}
                                    onEditTrip={onEditTripACB}
                                    onDeleteTrip={onDeleteTripACB}
                                    showDeleteConfirm={showDeleteConfirm.value}
                                    deleteTripName={trip?.name ?? 'this trip'}
                                    onConfirmDelete={onDeleteConfirmACB}
                                    onCancelDelete={onDeleteCancelACB}
                                    shareLoading={!!sharePromiseState.value.promise}
                                    shareError={!!sharePromiseState.value.error}
                                    isShared={isShared.value}
                                    shareURL={shareURL.value}
                                    shareCopied={copied.value}
                                    onShare={onShareACB}
                                    onStopShare={onStopShareACB}
                                    onCopyShare={onCopyShareACB}
                                    onEditNote={onEditNoteACB}
                                    onEditStartTime={onEditStartTimeACB}
                                    onEditEndTime={onEditEndTimeACB}
                                    onEditBudget={onEditBudgetACB}
                                    onRemoveSpot={onRemoveSpotACB}
                                    onAddActivity={onAddActivityACB}
                                />
            );
        };
    },
});
