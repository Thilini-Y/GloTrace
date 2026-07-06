export function mapError(error) {
  if (!error || !error.code) {
    return { code: "unknown", message: "Something went wrong. Please try again." };
  }

  const code = error.code.toString();
  const base = { code };

  switch (code) {
    case "auth/invalid-email":
      return { ...base, message: "The email address is not valid. Please enter a valid email." };
    case "auth/user-disabled":
      return { ...base, message: "This account has been disabled. Contact support." };
    case "auth/user-not-found":
      return { ...base, message: "No account found with this email. Please sign up first." };
    case "auth/wrong-password":
      return { ...base, message: "Incorrect password. Please try again." };
    case "auth/email-already-in-use":
      return { ...base, message: "Email already in use. Please log in or use other email." };
    case "auth/weak-password":
      return { ...base, message: "Password is too weak. Use at least 6 characters." };
    case "auth/invalid-credential":
      return { ...base, message: "Incorrect email or password. Please try again." };
    case "auth/popup-closed-by-user":
      return { ...base, message: "Something went wrong. Please try again." };
    case "auth/cancelled-popup-request":
      return { ...base, message: "Something went wrong. Please try again." };
    case "auth/network-request-failed":
      return { ...base, message: "Network error. Check your connection and try again." };
    default:
      return { ...base, message: "Something went wrong. Please try again." };
  }
}
