import SearchBarView from './SearchBarView.jsx';
import ResultsView   from './ResultsView.jsx';
import DetailView    from './DetailView.jsx';
import SidebarView   from './SidebarView.jsx';
import SuspenseView  from './SuspenseView.jsx';

const HERO_IMG   = 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&q=80';
const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Places to go',   value: 'attractions' },
  { label: 'Places to eat',  value: 'restaurants' },
  { label: 'Hotels',         value: 'hotels' },
  { label: 'Geo location',   value: 'geos' },
];

export default function ExploreView(props) {
  const hasQuery = props.city && props.city.trim() !== '';

  // Global loading (saving a plan / adding a spot) — full-page overlay.
  if (props.globalLoading) {
    return (
      <div className="explore-loading-container">
        <SuspenseView />
      </div>
    );
  }

  return (
    <div className="explore-container">

      <div className="explore-main-content">

        <div className="explore-hero-banner">
          <img src={HERO_IMG} className="explore-hero-img" />
          <div className="explore-hero-overlay">

            <button
              onClick={props.onBack}
              className="explore-back-btn"
            >
              <span className="material-icons" style={{ fontSize: 'inherit' }}>arrow_back</span>
              Home
            </button>

            <h1 className="explore-hero-title">
              Explore Destinations
            </h1>
            <p className="explore-hero-subtitle">
              Discover amazing places across the globe. Add your favorites and create the perfect itinerary.
            </p>

            <SearchBarView
              placeholder="Search destinations, landmarks, or food..."
              city={props.city}
              onSearch={props.onSearch}
              onClear={props.onClear}
            />
          </div>
        </div>

        <div className="explore-category-filters">
          {CATEGORIES.map(cat => {
            const active = props.category === cat.value;
            return (
              <button
                key={cat.value}
                disabled={!hasQuery}
                onClick={() => props.onCategoryChange(cat.value)}
                className={`explore-category-btn ${active ? 'active' : ''}`}
              >{cat.label}</button>
            );
          })}
        </div>

        {/* Search loading is scoped to the results region only */}
        <ResultsView
          results={props.results}
          searchLoading={props.searchLoading}
          selectedSpots={props.selectedSpots}
          error={props.error}
          onSelectPlace={props.onSelectPlace}
          onAddSpot={props.onAddSpot}
          onRemoveSpot={props.onRemoveSpot}
          onSuggest={props.onSearch}
        />
      </div>

      {/* Sidebar stays mounted — never replaced by a loading state */}
      <SidebarView
        selectedSpots={props.selectedSpots}
        arrivalDate={props.arrivalDate}
        departureDate={props.departureDate}
        isEditingTrip={props.isEditingTrip}
        onArrivalChange={props.onArrivalChange}
        onDepartureChange={props.onDepartureChange}
        onRemoveSpot={props.onRemoveSpot}
        onGeneratePlan={props.onGeneratePlan}
      />

      {/* Detail modal — shown when a place is selected or detail is loading */}
      {(props.selectedPlace || props.detailLoading) && (
        <DetailView
          place={props.selectedPlace}
          photos={props.photos}
          loading={props.detailLoading}
          selectedSpots={props.selectedSpots}
          onClose={props.onCloseDetail}
          onAddSpot={props.onAddSpot}
          onRemoveSpot={props.onRemoveSpot}
        />
      )}
    </div>
  );
}
