import logo from "../assets/logo.png";
import { ref } from "vue";

const imageError = ref(false);
function handleImgError() {
  imageError.value = true;
}

export default function NavbarView(props) {

    function handleHomeClick() {
        if (props.active === "home") {

            document.body.classList.remove("page-refresh"); 
            void document.body.offsetWidth; 
            document.body.classList.add("page-refresh");

            props.onHome();
        } else {
            props.onHome();
        }
    }
  return (
    <>
        <div className="navbar">
                
            <div className="nav-left">
                <div className="logo-wrapper" onClick={handleHomeClick}>
                    <img src={logo} alt="GLOTRACE logo" className="logo-img" />
                </div>

            </div>

            <div className="nav-right">

                <div className="nav-items">
                    <button
                    className={props.active === "home" ? "active" : ""}
                    onClick={props.onHome}>
                    <span className="material-icons">home</span>
                    Home
                    </button>

                    <button
                    className={props.active === "explore" ? "active" : ""}
                    onClick={props.onExplore}>
                    <span className="material-icons">explore</span>
                    Explore
                    </button>

                    <button
                    className={props.active === "trips" ? "active" : ""}
                    onClick={props.onTrips}>
                    <span className="material-icons">calendar_today</span>
                    All Trips
                    </button>

                </div>

                {props.user && (
                    <div className="avatar mobile" onClick={props.onToggleUserMenu}>
                        {(props.profile?.photoURL || props.user?.photoURL) && !imageError.value ? (
                        <img
                            src={props.profile?.photoURL || props.user?.photoURL}
                            alt="profile"
                            onError={handleImgError}
                        />
                        ) : (
                        <span className="avatar-letter">
                            {(props.user?.displayName || props.user?.email || "")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        )}
                    </div>
                )}


                <button className="menu-btn" onClick={props.onToggleMenu}>
                    <span className="material-icons">
                        {props.isOpen?.value ? "close" : "menu"}
                    </span>
                </button>


            </div>

            <div className="nav-auth">
                {props.user ? (
                    <div className="nav-user">

                    {props.showUserMenu.value && (
                        <div className="user-menu-overlay" onClick={props.onCloseUserMenu}></div>
                    )}

                    <div className="avatar desktop" onClick={props.onToggleUserMenu}>
                        {(props.profile?.photoURL || props.user?.photoURL) && !imageError.value ? (
                            <img
                            src={props.profile?.photoURL || props.user?.photoURL}
                            alt="profile"
                            onError={handleImgError}
                            />
                        ) : (
                            <span className="avatar-letter">
                            {(props.user?.displayName || props.user?.email || "")
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                        )}
                    </div>


                    {props.showUserMenu.value && (
                        <div className="user-dropdown">
                        <button onClick={props.onProfile}>
                            <span className="material-icons">person</span>
                            Profile
                        </button>

                        <button onClick={props.onSignOut}>
                            <span className="material-icons">logout</span>
                            Sign out
                        </button>
                        </div>
                    )}

                    </div>
                ) : (
                    <button className="nav-auth-button" onClick={props.onSignIn}>
                    Sign in
                    </button>
                )}
            </div>
        </div>

        <div className={`nav-drawer ${props.isOpen?.value ? "open" : ""}`}>

            <div className="drawer-items">

                <button
                    className={`menu-item ${props.active === "home" ? "active" : ""}`}
                    onClick={props.onHome}>
                    <span className="material-icons">home</span>
                    Home
                </button>

                <button
                    className={`menu-item ${props.active === "explore" ? "active" : ""}`}
                    onClick={props.onExplore}>
                    <span className="material-icons">explore</span>
                    Explore
                </button>

                <button
                    className={`menu-item ${props.active === "trips" ? "active" : ""}`}
                    onClick={props.onTrips}>
                    <span className="material-icons">calendar_today</span>
                    Planned Trips
                </button>

                {props.user && (
                <button
                    className={`menu-item ${props.active === "profile" ? "active" : ""}`}
                    onClick={props.onProfile}>
                    <span className="material-icons">person</span>
                    Profile
                </button>
                )}

                {props.user ? (
                <button className="menu-item" onClick={props.onSignOut}>
                    <span className="material-icons">logout</span>
                    Logout
                </button>
                ) : (
                <button className="auth-btn" onClick={props.onSignIn}>
                    <span className="material-icons">login</span>
                    Sign in
                </button>
                )}

            </div>
        </div>
    </>
  );
}