import { defineComponent, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGloTraceModel } from '../reactiveModel.js';
import TripView from '../views/TripView.jsx';

export default defineComponent({
  name: 'TripPresenter',
  setup() {
    const router = useRouter();
    const model = useGloTraceModel();

    const trips = computed(() => model.userModel.tripSummaries ?? []);

    function onTripClickACB(id) {
      router.push(`/itinerary/${id}`);
    }

    function onAddTripACB() {
      router.push('/');
    }

    return () => (
      <TripView
        trips={trips.value}
        onTripClick={onTripClickACB}
        onAddTrip={onAddTripACB}
      />
    );
  },
});
