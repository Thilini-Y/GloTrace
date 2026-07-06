import { ref } from 'vue';

export default function ShareButtonView(props) {
  const copied = ref(false);

  async function handleCopy() {
    if (!props.shareURL) return;
    await navigator.clipboard.writeText(props.shareURL);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
    props.onCopy?.();
  }

  if (!props.isShared) {
    return (
      <button
        onClick={props.onShare}
        disabled={props.loading}
        class="share-btn"
      >
        <span class="material-icons share-icon">share</span>
        {props.loading ? 'Enabling...' : 'Share Trip'}
      </button>
    );
  }

  return (
    <div class="share-container">
      <div class="share-link-container">
        <span class="share-link-text">
          {props.shareURL}
        </span>
        <button
          onClick={handleCopy}
          class={`share-copy-btn ${copied.value ? 'copied' : ''}`}
        >
          {copied.value ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      <button
        onClick={props.onStop}
        class="share-stop-btn"
      >
        Stop sharing
      </button>
    </div>
  );
}
