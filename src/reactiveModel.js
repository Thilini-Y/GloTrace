import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { userModel as baseUserModel }     from "./models/userModel";
import { searchModel as baseSearchModel } from "./models/searchModel";
import { tripModel as baseTripModel }     from "./models/tripModel";
import { routeModel as baseRouteModel }   from "./models/routeModel";

export const useGloTraceModel = defineStore('gloTrace', () => {
  const userModel   = reactive(baseUserModel);
  const searchModel = reactive(baseSearchModel);
  const tripModel   = reactive(baseTripModel);
  const routeModel  = reactive(baseRouteModel);

  const ui = reactive({
    showAuthOverlay: false,
    redirectAfterLogin: null,
    showAuth()         { this.showAuthOverlay = true; },
    hideAuth()         { this.showAuthOverlay = false; },
    setRedirect(path)  { this.redirectAfterLogin = path; },
    clearRedirect()    { this.redirectAfterLogin = null; },
  });
  return { userModel, ui, searchModel, tripModel, routeModel };
});