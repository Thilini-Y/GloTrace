import { defineComponent, ref, computed } from 'vue';
import SearchBarView from './SearchBarView.jsx';

const DESTINATIONS = [
  { name:'Paris',     country:'France',    region:'Europe',   img:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&q=80' },
  { name:'Tokyo',     country:'Japan',     region:'Asia',     img:'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&q=80' },
  { name:'London',    country:'UK',        region:'Europe',   img:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&q=80' },
  { name:'Rome',      country:'Italy',     region:'Europe',   img:'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&q=80'  },
  { name:'New York',  country:'USA',       region:'Americas', img:'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=500&q=80' },
  { name:'Stockholm', country:'Sweden',    region:'Europe',   img:'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=500&q=80' },
  { name:'Marrakech', country:'Morocco',   region:'Africa',   img:'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=500&q=80' },
  { name:'Bangkok',   country:'Thailand',  region:'Asia',     img:'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=500&q=80' },
  { name:'Sydney',    country:'Australia', region:'Oceania',  img:'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500&q=80' },
  { name:'Cairo',     country:'Egypt',     region:'Africa',   img:'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=500&q=80' },
];
const REGIONS = ['All','Europe','Asia','Americas','Africa','Oceania'];

export default defineComponent({
  name: 'HomeView',
  props: ['onSearch', 'onDestinationClick'],
  setup(props) {
    const activeRegion = ref('All');
    const filtered = computed(() =>
      DESTINATIONS.filter(d => activeRegion.value === 'All' || d.region === activeRegion.value)
    );

    return () => (
      <div className="home-container">

        <div className="home-hero">
          <h1 className="home-hero-title">
            Where to go next?
          </h1>
          <div className="home-search-container">
            <SearchBarView
              placeholder="Search destinations, cities, or countries"
              onSearch={props.onSearch}
            />
          </div>
        </div>

        <div className="home-destinations-container">
          <div className="home-header">
            <h2 className="home-section-title">Popular Destinations</h2>
            <div className="home-region-filters">
              {REGIONS.map(r => (
                <button key={r} onClick={() => { activeRegion.value = r; }}
                  className={`home-region-btn ${activeRegion.value === r ? 'active' : ''}`}
                >{r}</button>
              ))}
            </div>
          </div>

          <div className="home-destinations-grid">
            {filtered.value.map(dest => (
              <div key={dest.name} onClick={() => props.onDestinationClick(dest.name)}
                className="home-destination-card"
              >
                <img src={dest.img} alt={dest.name} className="home-destination-img" />
                <div className="home-destination-overlay" />
                <div className="home-destination-text">
                  <div className="home-destination-name">{dest.name}</div>
                  <div className="home-destination-country">{dest.country}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
});
