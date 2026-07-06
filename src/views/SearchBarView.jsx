export default function SearchBarView(props) {
  let inputValue = props.city || '';

  function submitACB(e) {
    e.preventDefault();
    if (inputValue.trim()) props.onSearch(inputValue.trim());
  }

  function clearACB() {
    inputValue = '';
    props.onClear?.();
  }

  return (
    <form
      onSubmit={submitACB}
      className="search-bar-form"
    >
      <span className="material-icons search-bar-icon">search</span>
      <input
        type="text"
        placeholder={props.placeholder || 'Search destinations...'}
        value={props.city || ''}
        onInput={e => { inputValue = e.target.value; }}
        className="search-bar-input"
      />

      {props.city && (
        <button
          type="button"
          onClick={clearACB}
          style="background:none;border:none;cursor:pointer;padding:0 8px;display:flex;align-items:center;color:#9CA3AF;"
        >
          <span class="material-icons" style="font-size:18px;">close</span>
        </button>
      )}
      
    </form>
  );
}
