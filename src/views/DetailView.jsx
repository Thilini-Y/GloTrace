export default function DetailView(props) {
  if (!props.place && !props.loading) return null;;

  const { place, photos } = props;
  const loading   = props.loading; 
  const heroPhoto = photos?.[0]?.images?.large?.url ?? photos?.[0]?.images?.medium?.url;
  const added = props.place && props.selectedSpots?.some(s => s.location_id === place.location_id); // Check whether the card has been added

  const shimmer = 'background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.2s infinite;border-radius:6px;';

  return (
    <div
      onClick={props.onClose}
      className="detail-overlay"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="detail-modal"
      >
        
        <button
          onClick={props.onClose}
          style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.4);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;z-index:10;padding:0;font-size:20px;line-height:1;font-family:Arial,sans-serif;"
        >
          ×
        </button>

        
        {loading
          ? <div style={`height:240px;${shimmer}`} />
          : heroPhoto
            ? <img src={heroPhoto} className="detail-hero-img" />
            : <div className="detail-placeholder" />
        }

        <div className="detail-content">
          <div className="detail-header">
          
            {loading
              ? <div style={`height:28px;width:60%;${shimmer}`} />
              : <h2 className="detail-title">{place.name}</h2>
            }

            {loading
              ? <div style={`height:36px;width:120px;border-radius:20px;${shimmer}`} />
              : added
                ? <button
                    onClick={() => { props.onRemoveSpot(place.location_id); props.onClose(); }}
                    className="detail-add-btn"
                    style="background:#6B7280;"
                  >✓ Added</button>
                : <button
                    onClick={() => { props.onAddSpot(place); props.onClose(); }}
                    className="detail-add-btn"
                  >+ Add to Plan</button>
            }
          </div>

          {loading
            ? <div style={`height:18px;width:40%;margin-top:12px;${shimmer}`} />
            : place.rating && (
                <div className="detail-rating">
                  <span className="detail-rating-text">★ {place.rating}</span>
                  <span className="detail-reviews">({place.num_reviews} reviews)</span>
                </div>
              )
          }

          {loading
            ? <div style={`height:16px;width:70%;margin-top:10px;${shimmer}`} />
            : place.address_obj?.address_string && (
                <div className="detail-address">
                  <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', color: '#4f4d4b' }}>place</span> {place.address_obj.address_string}
                </div>
              )
          }

          {loading
            ? <div>
                <div style={`height:14px;width:100%;margin-top:16px;${shimmer}`} />
                <div style={`height:14px;width:90%;margin-top:8px;${shimmer}`} />
                <div style={`height:14px;width:80%;margin-top:8px;${shimmer}`} />
              </div>
            : place.description && (
                <p className="detail-description">{place.description}</p>
              )
          }

          {!loading && photos.length > 1 && (
            <div className="detail-photos">
              {photos.slice(1).map((p, i) => (
                <img key={i} src={p.images?.small?.url} className="detail-photo" />
              ))}
            </div>
          )}

          {!loading && place.web_url && (
            <a href={place.web_url} target="_blank" className="detail-link">
              View on TripAdvisor →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
