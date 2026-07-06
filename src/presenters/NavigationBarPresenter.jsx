import { useRouter, useRoute } from "vue-router";
import NavbarView from "../views/NavigationBarView";
import { logout } from "../firebase/authService";
import { ref, watch } from "vue";

export default function NavbarPresenter(props) {

    const router = useRouter();
    const route = useRoute();

    const userModel = props.model?.userModel;
    const user = userModel?.user;
    const promiseState = userModel?.promiseState;

    const isOpen = ref(false);
    const showUserMenu = ref(false);
    

    function toggleMenu() {
        isOpen.value = !isOpen.value;
    }

    function closeMenu() {
        isOpen.value = false;
    }

    function onToggleUserMenu() {
        showUserMenu.value = !showUserMenu.value;
    }

    function closeUserMenu() {
        showUserMenu.value = false;
    }

    function goHome() {
        router.push("/");
        closeMenu();
        closeUserMenu();
    }

    function goExplore() {
        router.push("/explore");
        closeMenu();
        closeUserMenu();
    }

    watch(
        () => props.model?.userModel?.user,
        (newUser, oldUser) => {
            if (!oldUser && newUser && props.model.ui.redirectAfterLogin) {
              router.push(props.model.ui.redirectAfterLogin);
              props.model.ui.clearRedirect();
            }
        }
    );

    function goTrips() {
        if (!props.model.userModel.user) {
            props.model.ui.showAuth();
            props.model.ui.setRedirect("/trips");
            return;
        }
        router.push("/trips");
        closeMenu();
        closeUserMenu();
    }

    function goProfile() {
        router.push("/profile");
        closeMenu();
        closeUserMenu();
    }

    function goToAuthACB() {
        props.model.ui.showAuth();
        closeUserMenu();
    }

    function logoutACB() {
        logout(promiseState);
        router.push("/");
        closeMenu();
        closeUserMenu();
    }

    function getActive() {
        if (route.path === "/") return "home";
        if (route.path.startsWith("/explore")) return "explore";
        if (route.path.startsWith("/trips")) return "trips";
        if (route.path.startsWith("/profile")) return "profile";
    }

    return (
        <NavbarView
        user={user}
        profile={userModel?.profile}
        active={getActive()} 
        onHome={goHome}
        onExplore={goExplore}
        onTrips={goTrips}
        onProfile={goProfile}
        onSignIn={goToAuthACB}
        onSignOut={logoutACB}
        isOpen={isOpen}          
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        showUserMenu={showUserMenu}
        onToggleUserMenu={onToggleUserMenu}
        onCloseUserMenu={closeUserMenu}
        />
    );
}