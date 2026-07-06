import loadingGif from '../assets/loader.gif';

export default function ResultsView(props) {
  if (props.error) {
    return (
      <div className="results-error">
        ⚠️ {props.error}
      </div>
    );
  }

  if (props.searchLoading) {
    return (
      <div style="display:flex;justify-content:center;align-items:center;padding:80px 0;">
        <img src={loadingGif} className="loading-img" />
      </div>
    );
  }

  if (!props.results || props.results.length === 0) {
    return (
      <div className="results-empty">
        <div className="results-empty-title">
          Where do you want to go?
        </div>
        <div className="results-empty-subtitle">
          Search for a city above to discover attractions, restaurants and more.
        </div>
        <div className="results-suggestions">
          {['Paris', 'Tokyo', 'London', 'Rome', 'Stockholm'].map(city => (
            <button
              key={city}
              onClick={() => props.onSuggest && props.onSuggest(city)}
              className="results-suggestion-btn"
            >
              {city}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="results-grid">
      {props.results.map(place => {
        const img    = place.photo?.images?.large?.url ?? place.photo?.images?.medium?.url;
        const rating = place.rating;
        const city   = place.address_obj?.city ?? place.address_obj?.state ?? '';
        const desc   = place.description ?? place.address_obj?.address_string ?? '';
        const added  = props.selectedSpots?.some(s => s.location_id === place.location_id);

        return (
          <div
            key={place.location_id}
            className="results-card"
            onClick={() => props.onSelectPlace(place)}
          >
            <div className="results-card-image-container">
              {img
                ? <img src={img} alt={place.name} className="results-card-image" />
                : <div className="results-card-placeholder">🏛️</div>
              }
              {rating && (
                <div className="results-card-rating">
                  <span className="results-rating-star">★</span> {rating}
                </div>
              )}
              <button
                onClick={e => { 
                  e.stopPropagation(); 
                  added ? props.onRemoveSpot(place.location_id) : props.onAddSpot(place); 
                }}
                className={`results-add-btn ${added ? 'added' : ''}`}
                title={added ? 'Remove from plan' : 'Add to plan'}
              >{added ? '✓' : '+'}</button>
            </div>
            <div className="results-card-content">
              <h3 className="results-card-title">{place.name}</h3>
              {city && <div className="results-card-city">{city}</div>}
              {desc && (
                <p className="results-card-description">
                  {desc}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
