export default function DeleteConfirmView({ tripName, isOwner = true, onConfirm, onCancel }) {
  const title = isOwner ? 'Delete trip?' : 'Leave trip?';
  const message = isOwner
    ? 'will be permanently deleted. This cannot be undone.'
    : 'will be removed from your trips.';
  const actionLabel = isOwner ? 'Delete' : 'Leave';

  return (
    <div className="delete-overlay" onClick={onCancel}>
      <div
        className="delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-icon">🗑️</div>

        <div className="delete-title">{title}</div>

        <div className="delete-text">
          <strong>{tripName}</strong> {message}
        </div>

        <div className="delete-actions">
          <button
            className="delete-btn delete-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="delete-btn delete-btn-confirm"
            onClick={onConfirm}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
