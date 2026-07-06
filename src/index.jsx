import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { VueRoot, makeRouter } from './vueRoot.jsx';
import { useGloTraceModel } from './reactiveModel.js';
import { connectToPersistence } from "./firebase/firestoreModel";
import { watch } from "vue";
import './style.css';
import './utilities/googleMapsApi.js'; 

const pinia = createPinia();

const tempApp = createApp({ render: () => null });
tempApp.use(pinia);
tempApp.mount(document.createElement('div'));

const model = useGloTraceModel();

const router = makeRouter(model);

const app = createApp(<VueRoot model={model} />);
app.use(pinia);
app.use(router);
app.mount('#root');

connectToPersistence(model, watch, router);
