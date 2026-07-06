import SuspenseView from './SuspenseView.jsx';

export default function SharedTripView(props) {
  if (props.loading) {
  return (
    <div class="shared-loading">
      <SuspenseView />
    </div>
  );
}

  if (props.error || !props.trip) {
    return (
      <div class="shared-error-container">
        <div class="shared-error-text">
          <div class="shared-error-title">
            Invalid or expired link
          </div>
          <div class="shared-error-message">
            {props.error || 'This share link is no longer active.'}
          </div>
        </div>
      </div>
    );
  }

  const { trip } = props;

  return (
    <div class="shared-main">
      <div class="shared-card">

        <div class="shared-icon">✈️</div>

        <h1 class="shared-title">
          {trip.name}
        </h1>

        {trip.startDate && trip.endDate && (
          <div class="shared-dates">
            📅 {trip.startDate} → {trip.endDate}
          </div>
        )}

        <div class="shared-members">
          👥 {trip.members?.length || 1} traveller{(trip.members?.length || 1) !== 1 ? 's' : ''}
        </div>

        {props.isMember && (
          <div class="shared-member-notice">
             You're already part of this trip!
          </div>
        )}

        {!props.isMember && (
          <>
            {props.isLoggedIn ? (
              <button
                onClick={props.onJoinOriginal}
                class="shared-join-btn"
              >
                Join This Trip
              </button>
            ) : (
              <>
                <p class="shared-signin-text">
                  Sign in or create an account to join this trip and collaborate.
                </p>
                <button
                  onClick={props.onSignIn}
                  class="shared-signin-btn"
                >
                  Sign In to Join
                </button>
              </>
            )}
          </>
        )}

        {props.isMember && props.tripId && (
          <a
            href={`#/itinerary/${props.tripId}`}
            class="shared-view-link"
          >
            Open Itinerary →
          </a>
        )}
      </div>
    </div>
  );
}
