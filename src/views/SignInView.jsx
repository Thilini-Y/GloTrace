export default function SignInView(props) {

  const promise = props.promiseState?.promise;
  const error = props.promiseState?.error;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="close-btn" type="button" onClick={closeAuthOverlay}>
          ×
        </button>

        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">Sign in to continue planning your trips</div>

        <form onSubmit={submitACB} className="auth-form">
          <input
            className="auth-input"
            name="email"
            type="email"
            placeholder="Email"
            required
          />

          <input
            className="auth-input"
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <button className="auth-button" type="submit" disabled={!!promise}>
            {promise ? "Loading..." : "Login"}
          </button>

          {error && <div className="auth-error">{error.message}</div>}

          <div className="auth-footer">
            <span>Don’t have an account?</span>
            <button className="auth-link" type="button" onClick={goToSignupACB}>
              Signup
            </button>
          </div>
          <button className="auth-secondary" type="button" onClick={onBackACB}>
            Back
          </button>
        </form>
      </div>
    </div>
  );

  function submitACB(e) {
    e.preventDefault();
    const f = e.target;

    props.onLogin({
      email: f.email.value,
      password: f.password.value,
    });
  }

  function goToSignupACB() {
    props.onGoToSignup();
  }

  function onBackACB() {
    props.onBack();
  }

  function closeAuthOverlay() {
    props.onCloseAuth();      
  }
}