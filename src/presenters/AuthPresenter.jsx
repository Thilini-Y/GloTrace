import { signInOrSignUp } from "../firebase/authService";
import { signInWithGoogle } from "../firebase/googleAuthService";
import SignInView from "../views/SignInView";
import SignupView from "../views/SignUpView";
import SuspenseView from "../views/SuspenseView";
import AuthChoiceView from "../views/AuthChoiceView";

import { reactive, watch } from "vue";

const state = reactive({
  mode: "choice",
});

export default function AuthPresenter(props) {

  const userModel = props?.model?.userModel;
  
  if (!userModel) {
    return null;
  }

  const user = userModel.user;
  const ready = userModel.ready;
  const promiseState = userModel.promiseState;

  watch(
    () => userModel.user,
    (newUser, oldUser) => {
      if (oldUser && !newUser) {
        state.mode = "choice";
        if (props?.model?.userModel) {
          props.model.ui.hideAuth();
        }
      }
      if (!oldUser && newUser) {
        if (props?.model?.userModel) {
          props.model.ui.hideAuth();
        }
      }
    }
  );

  function loginACB({ email, password }) {
    signInOrSignUp(email, password, false, promiseState);
  }

  function signupACB({ email, password }) {
    if (props?.model && !props.model.ui.redirectAfterLogin) {
      props.model.ui.setRedirect("/profile");
    }
    signInOrSignUp(email, password, true, promiseState);
  }

  if (user === undefined) {
    return <SuspenseView />;
  }

  if (user) {
    if (props.onClose) props.onClose();
    return null;
  }

  function goToSignupACB() {
    state.mode = "signup";
    promiseState.error = null;
  }

  function goToLoginACB() {
    state.mode = "login";
    promiseState.error = null;
  }

  function goToEmailACB() {
    state.mode = "login";
  }

  function onCloseAuth() {
    props.onClose && props.onClose();
  }

  function isPromiseEnabled() {
    return props.promiseState?.promise;
  }


  function googleLoginACB() {
    signInWithGoogle(promiseState);
  }

  function goBackACB() {
    state.mode = "choice";
  }

  if (!user) {

    if (state.mode === "choice") {
      return (
        <AuthChoiceView
          onGoogle={googleLoginACB}
          onEmail={goToEmailACB}
          onCloseAuth={onCloseAuth}
        />
      );
    }

    if (state.mode === "login") {
      return (
        <SignInView
          onLogin={loginACB}
          onGoToSignup={goToSignupACB}
          onBack={goBackACB}
          promiseState={promiseState}
          onCloseAuth={onCloseAuth}
        />
      );
    }

    if (state.mode === "signup") {
      return (
        <SignupView
          onSignup={signupACB}
          onGoToLogin={goToLoginACB}
          promiseState={promiseState}
          onCloseAuth={onCloseAuth}
          isPromiseEnabled={isPromiseEnabled}
        />
      );
    }
  }

  return;
  
}