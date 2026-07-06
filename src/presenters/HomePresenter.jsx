import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import HomeView from '../views/HomeView.jsx';

export default defineComponent({
  name: 'HomePresenter',
  props: ['model'],
  setup(props) {
    const router = useRouter();

    function handleSearch(query) {
      props.model.searchModel.setQuery(query);
      router.push(`/explore?city=${encodeURIComponent(query)}`);
    }

    function handleDestinationClick(cityName) {
      props.model.searchModel.setQuery(cityName);
      router.push(`/explore?city=${encodeURIComponent(cityName)}`);
    }

    return () => (
      <HomeView
        onSearch={handleSearch}
        onDestinationClick={handleDestinationClick}
      />
    );
  },
});
