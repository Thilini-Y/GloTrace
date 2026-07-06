import { GOOGLE_MAPS_API_KEY } from "./apiConfig.js";

const ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const TRAVEL_MODES = ["WALK", "DRIVE", "TRANSIT", "BICYCLE"];
const FIELD_MASK = "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline";


(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
});

let mapsPromise = null;
let placesPromise = null;
let geometryPromise = null;
let markerPromise = null;

export function loadMapsLibrary() {
    if (!mapsPromise) {
        mapsPromise = google.maps.importLibrary("maps");
    }
    return mapsPromise;
}

export function loadPlacesLibrary() {
    if (!placesPromise) {
        placesPromise = google.maps.importLibrary("places");
    }
    return placesPromise;
}

export function loadGeometryLibrary() {
    if (!geometryPromise) {
        geometryPromise = google.maps.importLibrary("geometry");
    }
    return geometryPromise;
}

export function loadMarkerLibrary() {
    if (!markerPromise) {
        markerPromise = google.maps.importLibrary("marker");
    }
    return markerPromise;
}

function fetchRoute(origin, destination, travelMode) {
    const body = {
        origin,
        destination,
        travelMode,
        languageCode: "en-US",
        units: "METRIC",
    };

    return fetch(ROUTES_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
    })
        .then(function responseACB(response) {
            if (!response.ok) {
                return response.json().then(function errACB(err) {
                    console.error(travelMode + " API error:", err);
                    throw new Error(travelMode + " route failed: " + (err.error?.message || response.statusText));
                });
            }
            return response.json();
        })
        .then(function parseACB(data) {
            console.log(travelMode + " API response:", data);
            if (!data.routes || data.routes.length === 0) {
                return null;
            }
            const route = data.routes[0];
            return {
                travelMode: travelMode,
                distanceMeters: route.distanceMeters,
                duration: route.duration,          // e.g. "165s"
                encodedPolyline: route.polyline?.encodedPolyline || null,
            };
        });
}

function makePlaceIdWaypoint(placeId) {
    return {
        placeId: placeId,
    };
}
function makeLatLngWaypoint(lat, lng) {
    return {
        location: {
            latLng: {
                latitude: lat,
                longitude: lng,
            },
        },
    };
}

export function getRouteByLatLng(originLat, originLng, destLat, destLng) {
    const origin = makeLatLngWaypoint(originLat, originLng);
    const destination = makeLatLngWaypoint(destLat, destLng);

    return Promise.all(TRAVEL_MODES.map(mode => fetchRoute(origin, destination, mode)))
        .then(results => {
            // Aggregate result
            const routes = {};
            TRAVEL_MODES.forEach(function assignACB(mode, index) {
                routes[mode] = results[index];
            });
            console.log("Aggregated routes:", routes);
            return routes;
        });
}

export function getRouteByPlaceId(originPlaceId, destPlaceId) {
    const origin = makePlaceIdWaypoint(originPlaceId);
    const destination = makePlaceIdWaypoint(destPlaceId);

    return Promise.all(TRAVEL_MODES.map(mode => fetchRoute(origin, destination, mode)))
        .then(results => {
            // Aggregate result
            const routes = {};
            TRAVEL_MODES.forEach(function assignACB(mode, index) {
                routes[mode] = results[index];
            });
            console.log("Aggregated routes:", routes);
            return routes;
        });
} 


export function decodePolyline(encoded) {
  const path = google.maps.geometry.encoding.decodePath(encoded);
  console.log("Decoded polyline path:", path);
  return routePolyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: "#4285f4",
                strokeOpacity: 0.8,
                strokeWeight: 5,
            });
}

window.decodePolyline = decodePolyline;
window.getRouteByLatLng = getRouteByLatLng;
window.getRouteByPlaceId = getRouteByPlaceId;


