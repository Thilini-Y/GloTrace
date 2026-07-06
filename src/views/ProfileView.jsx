import defaultAvatar from "../assets/avatar.jpg";
import worldMapUrl from "../assets/world-map.svg";
import compassRoseUrl from "../assets/compass-rose.svg";

export default function ProfileView(props) {
  const {
    tripCount = 0,
    daysCount = 0,
    citiesCount = 0,
    recentTrips = [],
  } = props;

  return (
    <div className="profile-page">

      <div className="profile-bg-layer" aria-hidden="true">
        <img src={worldMapUrl} className="profile-world-map" alt="" />
        <img src={compassRoseUrl} className="profile-compass" alt="" />
        <span className="material-icons profile-decor-icon profile-icon-plane-tr">flight</span>
        <span className="material-icons profile-decor-icon profile-icon-plane-br">flight</span>
        <span className="material-icons profile-decor-icon profile-icon-pin-r1">place</span>
        <span className="material-icons profile-decor-icon profile-icon-pin-r2">place</span>
        <span className="material-icons profile-decor-icon profile-icon-globe">public</span>
      </div>

      <div className="profile-content">

        <div className="profile-main-card">

          <div className="profile-card-top">
            <div className="profile-left">
              <div className="avatar-wrapper">
                <img
                  src={props.photoURL || defaultAvatar}
                  alt="profile"
                  className="avatar-img"
                />
                {props.isEditing && (
                  <>
                    <label className="avatar-overlay">
                      <span className="material-icons">photo_camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => props.onImageChange(e.target.files[0])}
                        hidden
                      />
                    </label>
                    {props.photoURL && (
                      <button
                        type="button"
                        className="remove-photo-btn"
                        onClick={props.onRemovePhoto}
                      >
                        Remove photo
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="profile-right">
              {!props.isEditing && (
                <>
                  <h1 className="profile-name">{props.name || "Your Name"}</h1>
                  <p className="profile-bio">
                    {props.bio || "Add a short description about yourself..."}
                  </p>
                  <button className="edit-btn" onClick={props.onEdit}>
                    <span className="material-icons">edit</span>
                    Edit Profile
                  </button>
                </>
              )}

              {props.isEditing && (
                <>
                  <input
                    className="input-field"
                    value={props.name}
                    onInput={(e) => props.onNameChange(e.target.value)}
                    placeholder="Your name"
                  />
                  <textarea
                    className="input-field"
                    value={props.bio}
                    onInput={(e) => props.onBioChange(e.target.value)}
                    placeholder="Your bio"
                  />
                  <div className="btn-group">
                    <button className="save-btn" onClick={props.onSave}>Save</button>
                    <button className="cancel-btn" onClick={props.onCancel}>Cancel</button>
                  </div>
                  {props.error && <div className="error-text">{props.error}</div>}
                </>
              )}
            </div>
          </div>

          <div className="profile-stats-row">
            <div className="profile-stat">
              <div className="profile-stat-label">TRIPS</div>
              <div className="profile-stat-number">{tripCount}</div>
              <div className="profile-stat-sub">planned &amp; completed</div>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <div className="profile-stat-label">DAYS TRAVELED</div>
              <div className="profile-stat-number">{daysCount}</div>
              <div className="profile-stat-sub">across all trips</div>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <div className="profile-stat-label">CITIES</div>
              <div className="profile-stat-number">{citiesCount}</div>
              <div className="profile-stat-sub">unique destinations</div>
            </div>
          </div>
        </div>

        <div className="profile-trips-section">
          <h2 className="profile-trips-title">Recent Travel History</h2>
          {recentTrips.length === 0 ? (
            <p className="profile-trips-empty">No completed trips yet — start exploring!</p>
          ) : (
            <div className="profile-trips-grid">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="profile-trip-card">
                  {trip.photoURL ? (
                    <img src={trip.photoURL} alt={trip.name} className="profile-trip-img" />
                  ) : (
                    <div className="profile-trip-placeholder">
                      <span className="material-icons profile-trip-placeholder-icon">flight</span>
                    </div>
                  )}
                  <div className="profile-trip-overlay" />
                  <div className="profile-trip-footer">
                    <div className="profile-trip-name">{trip.name}</div>
                    {trip.dateStr && (
                      <div className="profile-trip-date">{trip.dateStr}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
