import { createRouter, createWebHashHistory, RouterView } from "vue-router";
import { defineComponent, ref, watch } from "vue";

import HomePresenter from "./presenters/HomePresenter.jsx";
import ExplorePresenter from "./presenters/ExplorePresenter.jsx";
import TripPresenter from "./presenters/TripPresenter.jsx";
import ItineraryPresenter from "./presenters/ItineraryPresenter.jsx";
import ProfilePresenter from "./presenters/ProfilePresenter.jsx";
import AuthPresenter from "./presenters/AuthPresenter.jsx";
import SharedTripPresenter  from "./presenters/SharedTripPresenter.jsx"; 

import SuspenseView from "./views/SuspenseView";
import NavbarPresenter from "./presenters/NavigationBarPresenter.jsx";

export function makeRouter(model){

    return createRouter({
        history: createWebHashHistory(),
        routes: [

            {
                path: "/",
                component: {
                    render() {
                        return <HomePresenter model={model} />;
                    }
                }
            },
            {
                path: "/explore",
                component: {
                    render() {
                        return <ExplorePresenter model={model} />;
                    }
                }
            },
            {
                path: "/trips",
                component: {
                    render() {
                        return <TripPresenter />
                    }
                }
            },
            {
                path: "/itinerary/:id",
                component: {
                    render() {
                        return <ItineraryPresenter model={model} tripId={this.$route.params.id}/>
                    }
                }
            },
            {
                path: "/profile",
                    component: {
                    render() {
                        return <ProfilePresenter model={model} />;
                    }
                }
            },
            {
                path: "/shared/:shareCode",
                component: { render() { return <SharedTripPresenter model={model} />; } }
            },
        ]
    });
}

const VueRoot = defineComponent({
    name: 'VueRoot',
    props: ['model'],
    setup(props) {
        const model = props.model;

        const toastMessage = ref(null);
        let toastTimer = null;

        watch(
            () => model.tripModel.deletedTripNotification,
            (notification) => {
                if (!notification) return;
                toastMessage.value = `"${notification.name}" has been deleted by the trip owner.`;
                model.tripModel.deletedTripNotification = null;
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => { toastMessage.value = null; }, 5000);
            }
        );

        function dismissToast() {
            clearTimeout(toastTimer);
            toastMessage.value = null;
        }

        function renderToast() {
            if (!toastMessage.value) return null;
            return (
                <div className="toast-container">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(255,255,255,0.85)" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" className="toast-icon">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{toastMessage.value}</span>
                    <button
                        onClick={dismissToast}
                        className="toast-close-btn"
                    >×</button>
                </div>
            );
        }

        function closeAuthOverlay() {
            model.ui.showAuthOverlay = false;
        }

        return () => {
            if (!model?.userModel?.ready) {
                return (
                    <div className="app-loading-container">
                        <SuspenseView promise={"loading"} />
                    </div>
                );
            }

            return (
                <div className="app-container">
                    <NavbarPresenter model={model} />
                    <RouterView/>
                    {model.ui.showAuthOverlay && (
                        <div className="modal-overlay" onClick={closeAuthOverlay}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <AuthPresenter model={model} onClose={closeAuthOverlay} />
                            </div>
                        </div>
                    )}
                    {renderToast()}
                </div>
            );
        };
    },
});

export { VueRoot }
