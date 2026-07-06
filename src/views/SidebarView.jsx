export default function SidebarView(props) {
  function openDatePickerACB(e) {
    try {
      e.currentTarget.showPicker?.();
    } catch {
      // Some browsers only allow showPicker from direct click/tap events.
    }
  }

  return (
    <div class="sidebar-container">

      <div>
        <h3 class="sidebar-header-title">Selected Spots</h3>
        <div class="sidebar-header-subtitle">{props.selectedSpots.length} locations added</div>
      </div>

      <div class="sidebar-date-pickers">
        <div>
          <div class="sidebar-date-label">ARRIVAL</div>
          <input type="date" value={props.arrivalDate}
            max={props.departureDate || undefined}
            onKeydown={e => e.preventDefault()}
            onPaste={e => e.preventDefault()}
            onClick={openDatePickerACB}
            onFocus={openDatePickerACB}
            onChange={e => props.onArrivalChange(e.target.value)}
            class="sidebar-date-input" />
        </div>
        <div>
          <div class="sidebar-date-label">DEPARTURE</div>
          <input type="date" value={props.departureDate}
            min={props.arrivalDate || undefined}
            onKeydown={e => e.preventDefault()}
            onPaste={e => e.preventDefault()}
            onClick={openDatePickerACB}
            onFocus={openDatePickerACB}
            onChange={e => props.onDepartureChange(e.target.value)}
            class="sidebar-date-input" />
        </div>
      </div>

      <button
        onClick={props.onGeneratePlan}
        class="sidebar-generate-btn"
        onMouseenter={e => (e.target.style.opacity='.88')}
        onMouseleave={e => (e.target.style.opacity='1')}
      >{props.isEditingTrip ? 'Update Plan!' : 'Generate Plan!'}</button>

      {props.selectedSpots.length === 0 ? (
        <div class="sidebar-empty">
          <div class="sidebar-empty-icon">Spots</div>
          <div class="sidebar-empty-text">No spots selected yet</div>
          <div class="sidebar-empty-subtext">Click the + button to add</div>
        </div>
      ) : (
        <div class="sidebar-spots-list">
          {props.selectedSpots.map(spot => {
            const thumb = spot.spotData?.photo?.images?.small?.url;
            return (
              <div key={spot.location_id}
                class="sidebar-spot-item">
                {thumb
                  ? <img src={thumb} class="sidebar-spot-img" />
                  : <div class="sidebar-spot-number">
                      {props.selectedSpots.indexOf(spot) + 1}
                    </div>
                }
                <div class="sidebar-spot-info">
                  <div class="sidebar-spot-name">{spot.spotData?.name}</div>
                  {spot.spotData?.rating && <div class="sidebar-spot-rating">★ {spot.spotData.rating}</div>}
                </div>
                <button onClick={() => props.onRemoveSpot(spot.location_id)}
                  class="sidebar-spot-remove">×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
