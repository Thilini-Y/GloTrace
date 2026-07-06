export default function SignUpView(props) {

  function submit(e) {
    e.preventDefault();
    const f = e.target;

    const password = f.password.value;
    const confirm = f.confirm.value;

    if (password !== confirm) {
      if (props.promiseState) {
        props.promiseState.error = {
          code: "auth/password-mismatch",
          message: "Passwords do not match. Please reenter them.",
        };
      }
      return;
    }

    props.onSignup({
      email: f.email.value,
      password,
    });
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="close-btn" type="button" onClick={closeAuthOverlay}>
          ×
        </button>

        <div className="auth-title">Create account</div>
        <div className="auth-subtitle">Getting started is quick and easy</div>

        <form onSubmit={submit} className="auth-form">

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
          <input
            className="auth-input"
            name="confirm"
            type="password"
            placeholder="Confirm Password"
            requiredx
          />

          <button className="auth-button" type="submit" disabled={!isPromiseEnabled}>
            {!isPromiseEnabled ? "Loading..." : "Signup"}
          </button>

          {props.promiseState.error && <div className="auth-error">{props.promiseState.error.message}</div>}

          <div className="auth-footer">
            Already have an account?
            <button className="auth-link" type="button" onClick={goToLoginACB}>
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  function isPromiseEnabled() {
    return props.promiseState?.promise;
  }

  function closeAuthOverlay() {
     props.onCloseAuth();
  }

  function goToLoginACB() {
    props.onGoToLogin();
  }
}

