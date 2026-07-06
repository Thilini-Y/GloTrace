import { defineComponent, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ExploreView from '../views/ExploreView.jsx';

export default defineComponent({
  name: 'ExplorePresenter',
  props: ['model'],
  setup(props) {
    const model  = props.model;
    const search = model.searchModel;
    const route  = useRoute();
    const router = useRouter();

    onMounted(() => {
      const city = route.query.city;
      if (city) search.doSearch(city, search.category);
    });

    watch(() => route.query.city, city => {
      if (city) search.doSearch(city, '');
    });

    watch(() => search.lastSavedTripId, id => {
      if (!id) return;
      search.clearLastSavedTripId();
      search.clearTripData();
      router.push(`/itinerary/${id}`);
    });

    function onClearACB() {
      search.clearSearch();
      router.push('/explore');
    }

    function handleGeneratePlan() {
      if (!model.userModel.user) {
        model.ui.setRedirect(`/explore?city=${encodeURIComponent(search.query)}`);
        model.ui.showAuth();
        return;
      }
      if (search.selectedSpots.length === 0) {
        search.setError('Please add at least one spot to your plan.');
        return;
      }
      search.generatePlan();
      if (search.isEditingTrip && search.currentEditingTripId) {
        router.push(`/itinerary/${search.currentEditingTripId}`);
        search.clearTripData();
      }
    }

    function onArrivalChangeACB(value) {
      search.setArrivalDate(value);
    }

    function onDepartureChangeACB(value) {
      search.setDepartureDate(value);
    }

    return () => (
      <ExploreView
        city={search.query}
        results={search.results}
        selectedPlace={search.selectedPlace}
        photos={search.photos}
        selectedSpots={search.selectedSpots}
        arrivalDate={search.arrivalDate}
        departureDate={search.departureDate}
        isEditingTrip={search.isEditingTrip}
        category={search.category}
        error={search.error}
        globalLoading={!!(search.addSpotPromiseState?.promise || search.savePromiseState?.promise)}
        searchLoading={!!search.promise}
        detailLoading={!!search.detailPromiseState?.promise}
        onSearch={city => router.push(`/explore?city=${encodeURIComponent(city)}`)}
        onClear={onClearACB}
        onCategoryChange={cat => search.doSearch(search.query, cat)}
        onSelectPlace={place => search.fetchPlaceDetail(place)}
        onCloseDetail={() => search.clearSelection()}
        onAddSpot={place => search.addSpot(place)}
        onRemoveSpot={id => search.removeSpot(id)}
        onGeneratePlan={handleGeneratePlan}
        onArrivalChange={onArrivalChangeACB}
        onDepartureChange={onDepartureChangeACB}
        onBack={() => router.push('/')}
      />
    );
  },
});
