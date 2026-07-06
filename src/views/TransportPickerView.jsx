const MODES = [
    { key: 'WALK',    label: 'Walking',          icon: 'directions_walk',    color: '#34a853' },
    { key: 'BICYCLE', label: 'Biking',            icon: 'directions_bike',    color: '#fbbc04' },
    { key: 'TRANSIT', label: 'Public transport',  icon: 'directions_transit', color: '#4285f4' },
    { key: 'DRIVE',   label: 'Driving',           icon: 'directions_car',     color: '#ea4335' },
];

function formatDuration(durationStr) {
    if (!durationStr) return null;
    const secs = parseInt(durationStr);
    if (isNaN(secs)) return null;
    const mins = Math.round(secs / 60);
    return mins < 1 ? '< 1 min' : `${mins} min`;
}

function formatDistance(meters) {
    if (!meters && meters !== 0) return null;
    return `${(meters / 1000).toFixed(1)} km`;
}

export default function TransportPickerView(props) {
    function renderSpinner() {
        return (
            <div class="transport-spinner-container">
                <div class="transport-spinner" />
                <div class="transport-spinner-text">
                    Fetching routes…
                </div>
            </div>
        );
    }

    function renderOptions() {
        return (
            <div>
                {MODES.map(function renderModeACB({ key, label, icon, color }) {
                    const route = props.routes?.[key];
                    const disabled = !route?.encodedPolyline || !route || !route?.duration;
                    const dur = route ? formatDuration(route.duration) : null;
                    const dist = route ? formatDistance(route.distanceMeters) : null;
                    return (
                        <div
                            key={key}
                            onClick={disabled ? undefined : () => props.onSelect(key, route?.duration ?? null)}
                            class={`transport-mode-item${disabled ? ' transport-mode-item--disabled' : ''}`}
                        >
                            <span class="transport-mode-icon material-icons" style={{ color: disabled ? '#bdbdbd' : color }}>{icon}</span>
                            <span class="transport-mode-label">
                                {label}
                            </span>
                            {disabled
                                ? <span class="transport-mode-unavailable">Unavailable</span>
                                : dur && dist && (
                                    <span class="transport-mode-duration">
                                        {dur}
                                        <span class="transport-mode-distance">({dist})</span>
                                    </span>
                                )
                            }
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div class="transport-overlay" onClick={props.onCancel}>
            <div class="transport-modal" onClick={(e) => e.stopPropagation()}>
                <h3 class="transport-title">
                    Choose Transport
                </h3>
                <div class="transport-subtitle">
                    {props.fromName} → {props.toName}
                </div>

                {props.loading ? renderSpinner() : renderOptions()}

                <button
                    onClick={props.onCancel}
                    class="transport-cancel-btn"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
