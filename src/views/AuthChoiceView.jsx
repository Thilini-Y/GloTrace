export default function AuthChoiceView(props) {
  return (
    <div className="auth-choice">

      <button className="close-btn" onClick={closeAuthOverlay}>×</button>

      <h2>Sign in to unlock features</h2>

      <div className="details-section">
        <button className="btn" onClick={goToGoogleACB}>
          Continue with Google
        </button>
      </div>

      <div className="details-section">
        <button className="btn" onClick={goToEmailACB}>
          Continue with Email
        </button>
      </div>

    </div>
  );

  function closeAuthOverlay() {
    props.onCloseAuth();
  }
  function goToEmailACB(){
    props.onEmail();
  }

  function goToGoogleACB(){
    props.onGoogle();
  }
}