import { defineComponent, ref, reactive, computed, onMounted } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import TransportPickerView from './TransportPickerView.jsx';
import SuspenseView from './SuspenseView.jsx';
import DeleteConfirmView from './DeleteConfirmView.jsx';

const MODE_ICON  = { walk: 'directions_walk', bike: 'directions_bike', transit: 'directions_transit', drive: 'directions_car' };
const MODE_LABEL = { walk: 'walk', bike: 'bike', transit: 'public transport', drive: 'drive' };
const MODE_COLOR = { walk: '#34a853', bike: '#fbbc04', transit: '#4285f4', drive: '#ea4335' };

const TIME_OPTIONS = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const period = h < 12 ? 'AM' : 'PM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            opts.push(`${h12}:${m === 0 ? '00' : '30'} ${period}`);
        }
    }
    return opts;
})();

const CURRENCIES = ['USD', 'EUR', 'SEK', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'KRW', 'SGD'];


function formatTabDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        day: String(d.getDate()),
    };
}

function formatDuration(durationStr) {
    const secs = parseInt(durationStr);
    if (isNaN(secs)) return '';
    const mins = Math.round(secs / 60);
    return mins < 1 ? '< 1 min' : `${mins} min`;
}

function getDateBadge(selectedDate) {
    if (!selectedDate) return null;
    const [, m, d] = selectedDate.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
}

export function getCategoryIcon(category) {
    const c = category?.toLowerCase() ?? '';
    const icon = (name) => `<span class="material-icons" style="font-size:18px;color:#555;">${name}</span>`;
    if (c.includes('restaurant') || c.includes('food') || c.includes('eat') || c.includes('dining')) return icon('restaurant');
    if (c.includes('museum'))                              return icon('museum');
    if (c.includes('attraction') || c.includes('landmark') || c.includes('monument')) return icon('tour');
    if (c.includes('hotel') || c.includes('lodging') || c.includes('accommodation'))  return icon('hotel');
    if (c.includes('shop') || c.includes('mall') || c.includes('market'))             return icon('storefront');
    if (c.includes('park') || c.includes('nature') || c.includes('garden'))           return icon('park');
    if (c.includes('bar') || c.includes('nightlife') || c.includes('club'))           return icon('local_bar');
    if (c.includes('cafe') || c.includes('coffee'))       return icon('local_cafe');
    if (c.includes('beach'))                               return icon('beach_access');
    return icon('place');
}

export function buildMarkerContent(icon, num) {
    const el = document.createElement('div');
    el.className = 'marker-content';
    el.innerHTML = `${icon}<span class="marker-number">${num}</span>`;
    return el;
}

export function buildPoiInfoWindowContent(poi, dates, onAddACB) {
    const s = (css) => css;

    const wrap = document.createElement('div');
    wrap.style.cssText = s('font-family:Inter,sans-serif;width:100%;max-width:290px;box-sizing:border-box;padding:4px 2px 6px;');

    const nameRow = document.createElement('div');
    nameRow.style.cssText = s('font-weight:700;font-size:17px;margin-bottom:6px;line-height:1.3;');
    nameRow.appendChild(document.createTextNode(poi.name));
    if (poi.rating != null) {
        const star = document.createElement('span');
        star.style.cssText = s('font-size:13px;font-weight:400;color:#666;margin-left:8px;display:inline-flex;align-items:center;gap:2px;');
        const starIcon = document.createElement('span');
        starIcon.className = 'material-icons';
        starIcon.style.cssText = s('font-size:13px;color:#F59E0B;');
        starIcon.textContent = 'star';
        star.appendChild(starIcon);
        star.appendChild(document.createTextNode(` ${poi.rating}`));
        nameRow.appendChild(star);
    }
    wrap.appendChild(nameRow);

    if (poi.address) {
        const addr = document.createElement('div');
        addr.style.cssText = s('font-size:13px;color:#555;margin-bottom:6px;display:flex;align-items:flex-start;gap:3px;');
        const pin = document.createElement('span');
        pin.className = 'material-icons';
        pin.style.cssText = s('font-size:13px;color:#888;flex-shrink:0;');
        pin.textContent = 'place';
        const text = document.createElement('span');
        text.textContent = poi.address;
        addr.appendChild(pin);
        addr.appendChild(text);
        wrap.appendChild(addr);
    }

    if (poi.mapsUrl) {
        const link = document.createElement('a');
        link.href = poi.mapsUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View on Google Maps';
        link.style.cssText = s('font-size:13px;color:#4285f4;text-decoration:underline;display:block;margin-bottom:14px;');
        wrap.appendChild(link);
    } else {
        const spacer = document.createElement('div');
        spacer.style.marginBottom = '14px';
        wrap.appendChild(spacer);
    }

    const label = document.createElement('div');
    label.style.cssText = s('font-size:13px;font-weight:500;color:#333;margin-bottom:8px;');
    label.textContent = 'Select Trip Day';
    wrap.appendChild(label);

    const select = document.createElement('select');
    select.style.cssText = s('width:100%;padding:10px 12px;margin-bottom:14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;background:#fff;cursor:pointer;outline:none;');

    function addOption(value, text) {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = text;
        select.appendChild(o);
    }
    addOption('tbd', 'TBD (unscheduled)');
    dates.forEach(function buildOptionACB(date) {
        const d = new Date(date + 'T00:00:00');
        const m = d.toLocaleDateString('en-US', { month: 'short' });
        const n = d.getDate();
        const w = d.toLocaleDateString('en-US', { weekday: 'short' });
        addOption(date, `${m} ${n} (${w})`);
    });
    wrap.appendChild(select);

    const btn = document.createElement('button');
    btn.textContent = '⊕ Add to Trip';
    btn.style.cssText = s('width:100%;padding:12px;background:#c0392b;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;');
    btn.addEventListener('click', function addClickACB() { onAddACB(select.value); });
    wrap.appendChild(btn);

    return wrap;
}


const TabBadge = ({ count, active }) => {
    if (!count) return null;
    return (
        <span class={active ? 'itinerary-tab-badge itinerary-tab-badge--active' : 'itinerary-tab-badge itinerary-tab-badge--inactive'}>
            {count}
        </span>
    );
};

const WalletIcon = () => (
    <span class="material-icons wallet-icon">wallet</span>
);

const NoteIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="#bbb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="itinerary-note-icon">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const ClockIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="#aaa" stroke-width="2" stroke-linecap="round" class="itinerary-clock-icon">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);


export default defineComponent({
    props: [
        'trip', 'dates', 'spots', 'selectedDate', 'dayHeading', 'mapCenter',
        'onSelectDate', 'onEditName', 'onAddDate', 'onRemoveDate', 'onChangeDates',
        'onReorder', 'onMapReady', 'transportModal',
        'onTransportClick', 'onTransportSelect', 'onTransportCancel', 'onAssignSpot',
        'onEditNote', 'onEditStartTime', 'onEditEndTime', 'onEditBudget',
        'onRemoveSpot', 'onAddActivity',
        'shareLoading', 'shareError', 'isShared', 'shareURL', 'shareCopied',
        'onShare', 'onStopShare', 'onCopyShare',
        'isOwner', 'onEditTrip', 'onDeleteTrip',
        'showDeleteConfirm', 'deleteTripName', 'onConfirmDelete', 'onCancelDelete',
        'onMoveSpot',
    ],

    setup(props) {
        const isEditingName = ref(false);
        const nameInputValue = ref('');
        const hoveredDate = ref(null);

        const budgetPopover = reactive({
            open: false,
            index: null,
            currency: 'USD',
            amount: '',
            purpose: '',
        });

        const mapContainerRef = ref(null);

        const tabsRef = ref(null);
        const tabsDragging = ref(false);
        let tabsStartX = 0;
        let tabsScrollLeft = 0;

        function onTabsMousedownACB(e) {
            tabsDragging.value = true;
            tabsStartX = e.pageX - tabsRef.value.offsetLeft;
            tabsScrollLeft = tabsRef.value.scrollLeft;
        }
        function onTabsMousemoveACB(e) {
            if (!tabsDragging.value) return;
            e.preventDefault();
            const x = e.pageX - tabsRef.value.offsetLeft;
            tabsRef.value.scrollLeft = tabsScrollLeft - (x - tabsStartX);
        }
        function onTabsMouseupACB() { tabsDragging.value = false; }

        onMounted(() => {
            if (mapContainerRef.value) props.onMapReady?.(mapContainerRef.value);
        });

        const spots = computed(() => props.spots ?? []);
        const dates = computed(() => props.dates ?? []);
        const tbdCount = computed(() => props.trip?.tbd?.length ?? 0);
        const dateBadge = computed(() => getDateBadge(props.selectedDate));
        const dayHeadingText = computed(() => {
            if (props.selectedDate === null) {
                const n = spots.value.length;
                return `TBD · ${n} stop${n !== 1 ? 's' : ''}`;
            }
            return props.dayHeading;
        });

        function startEditName() {
            nameInputValue.value = props.trip?.name ?? '';
            isEditingName.value = true;
        }
        function confirmEditName() {
            isEditingName.value = false;
            const trimmed = nameInputValue.value.trim();
            if (trimmed && trimmed !== props.trip?.name) props.onEditName?.(trimmed);
        }
        function nameKeydown(e) {
            if (e.key === 'Enter') confirmEditName();
            if (e.key === 'Escape') isEditingName.value = false;
        }

        function openDatePickerACB(e) {
            try {
                e.currentTarget.showPicker?.();
            } catch {
                // Some browsers only allow showPicker from direct click/tap events.
            }
        }

        function onStartDateChange(value) {
            const end = props.trip?.endDate ?? value;
            props.onChangeDates?.(value, value && end && value > end ? value : end);
        }

        function onEndDateChange(value) {
            const start = props.trip?.startDate ?? value;
            props.onChangeDates?.(value && start && value < start ? value : start, value);
        }

        function openBudget(index, spot) {
            budgetPopover.open = true;
            budgetPopover.index = index;
            budgetPopover.currency = spot.budget?.currency ?? 'USD';
            budgetPopover.amount = spot.budget?.amount != null ? String(spot.budget.amount) : '';
            budgetPopover.purpose = spot.budget?.purpose ?? '';
        }
        function closeBudget() { budgetPopover.open = false; }
        function saveBudget() {
            props.onEditBudget?.(budgetPopover.index, budgetPopover.amount, budgetPopover.currency, budgetPopover.purpose);
            budgetPopover.open = false;
        }
        function clearBudget() {
            props.onEditBudget?.(budgetPopover.index, '', '', '');
            budgetPopover.open = false;
        }


        function renderHeader() {
            return (
                <div class="itinerary-header">
                    <div class="itinerary-header-row">
                        {isEditingName.value ? (
                            <input
                                value={nameInputValue.value}
                                onInput={(e) => { nameInputValue.value = e.target.value; }}
                                onBlur={confirmEditName}
                                onKeydown={nameKeydown}
                                autofocus
                                class="itinerary-name-input"
                            />
                        ) : (
                            <div class="itinerary-name-display">
                                <h2 class="itinerary-name-heading">
                                    {props.trip?.name ?? 'Itinerary'}
                                </h2>
                                <button
                                    onClick={startEditName}
                                    title="Edit trip name"
                                    class="itinerary-edit-name-btn"
                                ><span class="material-icons">edit</span></button>
                            </div>
                        )}

                        {!isEditingName.value && (
                            <div class="itinerary-header-actions">
                                <button
                                    onClick={props.onEditTrip}
                                    class="itinerary-explore-btn"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                                    </svg>
                                    Explore More
                                </button>
                                <button
                                    onClick={props.onDeleteTrip}
                                    class="itinerary-delete-btn"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="2"
                                        stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6l-1 14H6L5 6"/>
                                        <path d="M10 11v6"/>
                                        <path d="M14 11v6"/>
                                        <path d="M9 6V4h6v2"/>
                                    </svg>
                                    {props.isOwner ? 'Delete Trip' : 'Leave Trip'}
                                </button>
                            </div>
                        )}
                    </div>

                    {props.trip && (
                        <div class="itinerary-date-grid">
                            <div>
                                <div class="itinerary-date-label">ARRIVAL</div>
                                <input
                                    type="date"
                                    value={props.trip.startDate ?? ''}
                                    max={props.trip.endDate || undefined}
                                    onKeydown={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                    onClick={openDatePickerACB}
                                    onFocus={openDatePickerACB}
                                    onChange={(e) => onStartDateChange(e.target.value)}
                                    class="itinerary-date-input"
                                />
                            </div>
                            <div>
                                <div class="itinerary-date-label">DEPARTURE</div>
                                <input
                                    type="date"
                                    value={props.trip.endDate ?? ''}
                                    min={props.trip.startDate || undefined}
                                    onKeydown={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                    onClick={openDatePickerACB}
                                    onFocus={openDatePickerACB}
                                    onChange={(e) => onEndDateChange(e.target.value)}
                                    class="itinerary-date-input"
                                />
                            </div>
                        </div>
                    )}

                    {!isEditingName.value && (
                        <div class="itinerary-share-wrapper" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;">
                            {/* Live saving indicator */}
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="
                                    width:8px;height:8px;border-radius:50%;
                                    background:#22c55e;
                                    display:inline-block;
                                    box-shadow:0 0 0 0 rgba(34,197,94,0.4);
                                    animation:livePulse 2s infinite;
                                "/>
                                <span style="font-size:12px;color:#6B7280;font-weight:500;">Live saving</span>
                            </div>
                            {renderShareWidget()}
                        </div>
                        )}
                    </div>
            );
        }

                // Render the share widget based on boolean props from the Presenter.
                function renderShareWidget() {
                    if (props.shareLoading) {
                        return <SuspenseView />;
                    }
                    if (props.shareError) {
                        return <div class="itinerary-share-error">Share failed. Try again.</div>;
                    }
                    if (!props.isShared) {
                        return (
                            <button onClick={() => props.onShare?.()} class="itinerary-share-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2"
                                    stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                                Share Trip
                            </button>
                        );
                    }
                    return (
                        <div class="itinerary-share-container">
                            <div class="itinerary-share-link-container">
                                <span class="itinerary-share-link-text">{props.shareURL}</span>
                                <button
                                    onClick={() => props.onCopyShare?.()}
                                    class={`itinerary-copy-btn ${props.shareCopied ? 'copied' : ''}`}
                                >
                                    {props.shareCopied ? '✓ Copied!' : 'Copy'}
                                </button>
                            </div>
                            <button onClick={() => props.onStopShare?.()} class="itinerary-stop-share-btn">
                                Stop sharing
                            </button>
                        </div>
                    );
                }

        function renderDateTabs() {
            return (
                <div class="itinerary-tabs-sticky">
                <div
                    ref={tabsRef}
                    onMousedown={onTabsMousedownACB}
                    onMousemove={onTabsMousemoveACB}
                    onMouseup={onTabsMouseupACB}
                    onMouseleave={onTabsMouseupACB}
                    class="itinerary-tabs-scroll"
                    style={{ cursor: tabsDragging.value ? 'grabbing' : 'grab' }}
                >
                    <div
                        class={props.selectedDate === null ? 'itinerary-tab active' : 'itinerary-tab'}
                        onClick={() => props.onSelectDate?.(null)}
                    >
                        <span class="itinerary-tab-tbd-dash">—</span>
                        <span class="itinerary-tab-tbd-label">TBD</span>
                        <TabBadge count={tbdCount.value} active={props.selectedDate === null} />
                    </div>

                    {dates.value.map((date) => {
                        const { weekday, month, day } = formatTabDate(date);
                        const count = (props.trip?.days?.[date] ?? []).length;
                        const active = props.selectedDate === date;
                        const hovered = hoveredDate.value === date;
                        return (
                            <div
                                key={date}
                                class={active ? 'itinerary-tab active' : 'itinerary-tab'}
                                onClick={() => props.onSelectDate?.(date)}
                                onMouseenter={() => { hoveredDate.value = date; }}
                                onMouseleave={() => { hoveredDate.value = null; }}
                            >
                                <div
                                    onClick={(e) => { e.stopPropagation(); props.onRemoveDate?.(date); }}
                                    title="Remove this day"
                                    class="itinerary-tab-remove"
                                    style={{
                                        opacity: (hovered && dates.value.length > 1) ? 1 : 0,
                                        pointerEvents: dates.value.length > 1 ? 'auto' : 'none',
                                    }}
                                >−</div>
                                <span class="itinerary-tab-weekday">
                                    {weekday}
                                </span>
                                <span class="itinerary-tab-day">
                                    {month} {day}
                                </span>
                                <TabBadge count={count} active={active} />
                            </div>
                        );
                    })}

                    <button onClick={() => props.onAddDate?.()} title="Add a day" class="itinerary-circle-btn">+</button>
                </div>
                </div>
            );
        }

        function renderTransportRow(index) {
            if (props.selectedDate === null) return null;
            const transport = spots.value[index]?.transportToNext;
            const hasTransport = !!(transport?.mode);
            return (
                <div
                    onClick={() => props.onTransportClick?.(index)}
                    class={hasTransport
                        ? 'itinerary-transport-row itinerary-transport-row--has-transport'
                        : 'itinerary-transport-row itinerary-transport-row--no-transport'}
                >
                    {hasTransport ? (
                        <>
                            <span
                                class="material-icons"
                                style={{ fontSize: '16px', color: MODE_COLOR[transport.mode] ?? '#888', verticalAlign: 'middle', marginRight: '4px' }}
                            >{MODE_ICON[transport.mode] ?? 'swap_horiz'}</span>
                            <span>{MODE_LABEL[transport.mode] ?? transport.mode} · {formatDuration(transport.duration)}</span>
                        </>
                    ) : (
                        <span class="itinerary-transport-add-btn">
                            <span class="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '5px' }}>alt_route</span>
                            Add Transport +
                        </span>
                    )}
                </div>
            );
        }

        function renderSpot(spot, index) {
            const isLast = index === spots.value.length - 1;
            const hasBudget = !!(spot.budget?.amount);

            return (
                <div key={spot.location_id}>
                    <div class="itinerary-spot-card">
                        <div class="itinerary-spot-inner">
                            <span class="drag-handle itinerary-drag-handle">⠿⠿</span>

                            <span class="itinerary-spot-number">{index + 1}</span>

                            <div class="itinerary-spot-body">
                                <div class="itinerary-spot-top-row">
                                    <div class="itinerary-spot-info">
                                        <div class="itinerary-spot-name">
                                            {spot.spotData?.name}
                                        </div>
                                        <div class="itinerary-spot-meta">
                                            {[spot.spotData?.category?.name, spot.spotData?.address_obj?.street1]
                                                .filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                    {spot.spotData?.rating && (
                                        <span class="itinerary-spot-rating">
                                            ★ {spot.spotData.rating}
                                        </span>
                                    )}
                                    <button onClick={() => props.onRemoveSpot?.(index)} title="Remove" class="itinerary-remove-spot-btn">×</button>
                                </div>

                                {props.selectedDate === null && (
                                    <div class="itinerary-assign-row">
                                        <span class="itinerary-assign-btn">Assign to</span>
                                        <select
                                            class="itinerary-assign-day-select"
                                            onChange={(e) => {
                                                const target = e.target.value;
                                                if (target) { props.onMoveSpot?.(index, target); e.target.value = ''; }
                                            }}
                                        >
                                            <option value="">Select day...</option>
                                            {dates.value.map((date) => {
                                                const [, m, d] = date.split('-');
                                                return <option key={date} value={date}>{parseInt(m)}/{parseInt(d)}</option>;
                                            })}
                                        </select>
                                    </div>
                                )}

                                <div class="itinerary-note-row">
                                    <NoteIcon />
                                    <textarea
                                        value={spot.note ?? ''}
                                        placeholder="Add notes, links, etc. here..."
                                        rows={1}
                                        onInput={(e) => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#c0392b'; e.target.style.background = '#fff'; }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#f0e0e0';
                                            e.target.style.background = '#fafafa';
                                            props.onEditNote?.(index, e.target.value);
                                        }}
                                        class="itinerary-note-textarea"
                                    />
                                </div>

                                {props.selectedDate !== null && (
                                    <div class="itinerary-time-row">
                                        <ClockIcon />
                                        <select
                                            value={spot.startTime ?? ''}
                                            onChange={(e) => props.onEditStartTime?.(index, e.target.value)}
                                            class="itinerary-time-select"
                                            style={{ color: spot.startTime ? '#333' : '#aaa' }}
                                        >
                                            <option value="">Start</option>
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <span class="itinerary-time-arrow">→</span>
                                        <select
                                            value={spot.endTime ?? ''}
                                            onChange={(e) => props.onEditEndTime?.(index, e.target.value)}
                                            class="itinerary-time-select"
                                            style={{ color: spot.endTime ? '#333' : '#aaa' }}
                                        >
                                            <option value="">End</option>
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <div class="itinerary-time-spacer" />
                                        {dateBadge.value && (
                                            <select
                                                value={props.selectedDate}
                                                onChange={(e) => {
                                                    const target = e.target.value;
                                                    if (target !== props.selectedDate) props.onMoveSpot?.(index, target);
                                                }}
                                                class="itinerary-move-select"
                                            >
                                                <option value="tbd">TBD</option>
                                                {dates.value.map((date) => {
                                                    const [, m, d] = date.split('-');
                                                    return <option key={date} value={date}>{parseInt(m)}/{parseInt(d)}</option>;
                                                })}
                                            </select>
                                        )}
                                    </div>
                                )}

                                <div class="itinerary-budget-row">
                                    <button
                                        onClick={() => openBudget(index, spot)}
                                        class="itinerary-budget-btn"
                                        style={{ color: hasBudget ? '#444' : '#aaa' }}
                                    >
                                        <WalletIcon />
                                        {hasBudget
                                            ? <span>{spot.budget.amount} {spot.budget.currency}{spot.budget.purpose ? ` · ${spot.budget.purpose}` : ''}</span>
                                            : <span>Add cost</span>
                                        }
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                    {!isLast && renderTransportRow(index)}
                </div>
            );
        }

        return () => (
            <div class="itinerary-layout">
                <div class="itinerary-left-panel">
                    {renderHeader()}
                    {renderDateTabs()}

                    {dayHeadingText.value && (
                        <div class="itinerary-day-heading-container">
                            <div class="itinerary-day-heading">
                                {dayHeadingText.value}
                            </div>
                        </div>
                    )}

                    {spots.value.length === 0 ? (
                        <div class="itinerary-empty">
                            No spots for this day yet.
                        </div>
                    ) : (
                        <VueDraggable
                            modelValue={spots.value}
                            onUpdate:modelValue={(newList) => props.onReorder?.(newList)}
                            animation={200}
                            handle=".drag-handle"
                        >
                            {spots.value.map((spot, index) => renderSpot(spot, index))}
                        </VueDraggable>
                    )}

                    <div class="itinerary-map-hint">
                        Add spots by clicking a POI on the map
                    </div>
                </div>

                <div class="itinerary-right-panel">
                    <div ref={mapContainerRef} class="itinerary-map-container" />
                    {props.mapCenter && (
                        <div class="itinerary-map-coords">
                            {props.mapCenter.lat.toFixed(4)}°, {props.mapCenter.lng.toFixed(4)}°
                        </div>
                    )}
                </div>

                {budgetPopover.open && (
                    <div onClick={closeBudget} class="itinerary-popover-overlay">
                        <div onClick={(e) => e.stopPropagation()} class="itinerary-popover-card">
                            <div class="itinerary-popover-header">
                                <span class="itinerary-popover-title">
                                    <WalletIcon /> Set Budget
                                </span>
                                <button onClick={closeBudget} class="itinerary-popover-close">×</button>
                            </div>

                            <div class="itinerary-budget-row-inputs">
                                <select
                                    value={budgetPopover.currency}
                                    onChange={(e) => { budgetPopover.currency = e.target.value; }}
                                    class="itinerary-currency-select"
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input
                                    type="text" inputmode="decimal"
                                    value={budgetPopover.amount}
                                    placeholder="0.00"
                                    onInput={(e) => {
                                        let v = e.target.value.replace(/[^0-9.]/g, '');
                                        const parts = v.split('.');
                                        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                                        if (parts[1]?.length > 2) v = parts[0] + '.' + parts[1].slice(0, 2);
                                        if (e.target.value !== v) {
                                            const pos = e.target.selectionStart - (e.target.value.length - v.length);
                                            e.target.value = v;
                                            e.target.setSelectionRange(pos, pos);
                                        }
                                        budgetPopover.amount = v;
                                    }}
                                    class="itinerary-amount-input"
                                    onFocus={(e) => { e.target.style.borderColor = '#c0392b'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#e8e8e8'; }}
                                />
                            </div>

                            <input
                                type="text"
                                value={budgetPopover.purpose}
                                placeholder="Purpose (e.g. Entrance fee)"
                                onInput={(e) => { budgetPopover.purpose = e.target.value; }}
                                class="itinerary-purpose-input"
                                onFocus={(e) => { e.target.style.borderColor = '#c0392b'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e8e8e8'; }}
                            />

                            <div class="itinerary-popover-actions">
                                <button onClick={saveBudget} class="itinerary-save-btn">Save</button>
                                {budgetPopover.amount && (
                                    <button onClick={clearBudget} class="itinerary-clear-btn">Clear</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {props.showDeleteConfirm && (
                    <DeleteConfirmView
                        tripName={props.deleteTripName}
                        isOwner={props.isOwner}
                        onConfirm={props.onConfirmDelete}
                        onCancel={props.onCancelDelete}
                    />
                )}

                {props.transportModal && (
                    <TransportPickerView
                        fromName={props.transportModal.fromName}
                        toName={props.transportModal.toName}
                        loading={props.transportModal.loading}
                        routes={props.transportModal.routes}
                        onSelect={props.onTransportSelect}
                        onCancel={props.onTransportCancel}
                    />
                )}
            </div>
        );
    },
});
