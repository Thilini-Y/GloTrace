import { defineComponent } from 'vue';
import SharedBadgeView from './SharedBadgeView.jsx';

function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return null;
    const fmt = d =>
        new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T00:00:00');
    const diffMs   = end - start;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return `${fmt(startDate)} – ${fmt(endDate)} · ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

function PlaceholderIcon() {
    return (
        <svg
            viewBox="0 0 64 64"
            class="trip-placeholder-icon"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect x="6" y="14" width="52" height="38" rx="4" stroke="#9CA3AF" stroke-width="3" />
            <circle cx="22" cy="28" r="6" stroke="#9CA3AF" stroke-width="3" />
            <path d="M6 40 l14-10 10 8 10-12 18 14" stroke="#9CA3AF" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
    );
}

export default defineComponent({
    name: 'TripView',
    props: ['trips', 'onTripClick', 'onAddTrip'],
    setup(props) {
        return () => (
            <div class="trip-view-container">
                <div class="trip-view-header">
                    <h1 class="trip-view-title">
                        Personal Travel Journal
                    </h1>
                    <p class="trip-view-subtitle">
                        Revisit your most precious moments around the world.
                    </p>
                </div>

                <div class="trip-view-grid">
                    {(props.trips || []).map(trip => (
                        <div
                            key={trip.id}
                            onClick={() => props.onTripClick(trip.id)}
                            class="trip-card"
                        >
                            {trip.photoURL
                                ? <img src={trip.photoURL} alt={trip.name}
                                    class="trip-card-img" />
                                : <div class="trip-card-placeholder">
                                    <PlaceholderIcon />
                                  </div>
                            }

                            {trip.photoURL &&
                                <div class="trip-card-overlay" />
                            }

                            <div class="trip-card-text">
                                <div class="trip-card-name-container">
                                    <div class={`trip-card-name ${trip.photoURL ? '' : 'trip-card-name--no-photo'}`}>
                                        {trip.name}
                                    </div>
                                    {Boolean(trip.isShared) && <SharedBadgeView />}
                                </div>
                                {formatDateRange(trip.startDate, trip.endDate) &&
                                    <div class={`trip-card-date ${trip.photoURL ? '' : 'trip-card-date--no-photo'}`}>
                                        {formatDateRange(trip.startDate, trip.endDate)}
                                    </div>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    },
});
