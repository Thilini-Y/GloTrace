import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isMember } from '../utilities/shareUtils.js';
import SharedTripView from '../views/SharedTripView.jsx';

export default defineComponent({
  name: 'SharedTripPresenter',
  props: ['model'],
  setup(props) {
    const route  = useRoute();
    const router = useRouter();
    const model  = props.model;

    const loading = ref(true);

    const trip  = computed(() => model.tripModel.sharedTripResult);
    const error = computed(() => model.tripModel.sharedTripError);
    const uid   = computed(() => model.userModel.user?.uid);

    onMounted(() => {
      loading.value = true;
      model.tripModel.lookupByShareCode(route.params.shareCode);
    });

    watch(
      () => route.params.shareCode,
      (newCode) => {
        if (newCode) {
          loading.value = true;
          model.tripModel.lookupByShareCode(newCode);
        }
      }
    );

    watch(
      () => model.userModel.tripSummaries.map(s => s.id).join(','),
      () => {
        if (route.params.shareCode) {
          loading.value = true;
          model.tripModel.lookupByShareCode(route.params.shareCode);
        }
      }
    );

    watch(
      () => model.tripModel.sharedTripResult,
      (result) => { if (result !== null || model.tripModel.sharedTripError) loading.value = false; }
    );
    watch(
      () => model.tripModel.sharedTripError,
      (err) => { if (err) loading.value = false; }
    );

    watch(
      () => model.tripModel.lastJoinedTripId,
      (tripId) => {
        if (tripId) {
          model.tripModel.clearLastJoinedTripId();
          router.push(`/itinerary/${tripId}`);
        }
      }
    );
    watch(
      () => model.tripModel.lastClonedTripId,
      (tripId) => {
        if (tripId) {
          model.tripModel.clearLastClonedTripId();
          router.push(`/itinerary/${tripId}`);
        }
      }
    );

    function handleJoinOriginal() {
      if (!uid.value || !trip.value?.id) return;
      const summary = {
        id:        trip.value.id,
        name:      trip.value.name      || '',
        startDate: trip.value.startDate || null,
        endDate:   trip.value.endDate   || null,
        photoURL:  trip.value.photoURL  || null,
        isShared:  trip.value.isShared ?? true,
      };
      model.tripModel.joinTrip(trip.value.id, summary);
    }

    function handleClone() {
      if (!uid.value || !trip.value?.id) return;
      model.tripModel.cloneTrip({
        name:      trip.value.name,
        startDate: trip.value.startDate || null,
        endDate:   trip.value.endDate   || null,
        tbd:       trip.value.tbd  || [],
        days:      trip.value.days || {},
        photoURL:  trip.value.photoURL || null,
      });
    }

    function handleSignIn() {
      model.ui.showAuth();
    }

    return () => (
      <SharedTripView
        trip={trip.value}
        tripId={trip.value?.id}
        isMember={isMember(trip.value, uid.value)}
        isLoggedIn={!!model.userModel.user}
        loading={loading.value}
        error={error.value}
        onJoinOriginal={handleJoinOriginal}
        onClone={handleClone}
        onSignIn={handleSignIn}
      />
    );
  },
});
