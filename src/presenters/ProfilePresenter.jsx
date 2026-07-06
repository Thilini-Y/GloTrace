import { reactive } from "vue";
import ProfileView from "../views/ProfileView";
import { uploadProfileImage } from "../services/storageService";


const state = reactive({
  isEditing: false,
  name: "",
  bio: "",
  photoURL: "",
  file: null,
  error: null,
  removePhoto: false,
  initializedFor: null
});

export default function ProfilePresenter(props) {
  const userModel = props?.model?.userModel;

  if (!userModel || !userModel.ready) {
    return <SuspenseView promise={"loading"} />;
  }

  const currentUserId = userModel.user?.uid || null;
  if (state.initializedFor !== currentUserId) {
    state.name = userModel.profile?.name || "";
    state.bio = userModel.profile?.bio || "";
    state.photoURL = userModel.profile?.photoURL || "";
    state.file = null;   
    state.isEditing = false;
    state.initializedFor = currentUserId;
  }

  function onEdit() {
    state.isEditing = true;
    state.error = null;
  }

  function onCancel() {
    state.isEditing = false;

    state.name = userModel.profile?.name || "";
    state.bio = userModel.profile?.bio || "";
    state.photoURL = userModel.profile?.photoURL || "";
    state.file = null;
  }

  function onNameChange(name) {
    state.name = name;
  }

  function onBioChange(bio) {
    state.bio = bio;
  }

  function onImageChange(file) {
    if (!file) return;

    state.error = null;
    state.removePhoto = false;

    if (state.photoURL?.startsWith("blob:")) {
      URL.revokeObjectURL(state.photoURL);
    }

    state.file = file;

    state.photoURL = URL.createObjectURL(file);
  }

  function onRemovePhoto() {
    state.removePhoto = true;
    if (state.photoURL?.startsWith("blob:")) {
      URL.revokeObjectURL(state.photoURL);
    }
    state.file = null;
    state.photoURL = "";
  }

  function onSave() {
    state.error = null;

    function successACB(photoURL) {
      userModel.updateProfile({
        name: state.name,
        bio: state.bio,
        photoURL
      });

      state.isEditing = false;
      state.file = null;
    }

    function errorACB(error) {
      state.error = "Failed to upload image. Please try again."; 
    }

    if (state.file) {
      uploadProfileImage(state.file)
        .then(successACB)
        .catch(errorACB);
    } else if (state.removePhoto) {
      state.removePhoto = false;
      successACB("");
    } else {
      successACB(userModel.profile.photoURL);
    }
  }

  const tripSummaries = userModel.tripSummaries || [];

  const tripCount = tripSummaries.length;

  const traveledDays = new Set();
  tripSummaries.forEach((trip) => {
    if (!trip.startDate || !trip.endDate) return;
    const end = new Date(trip.endDate);
    for (let d = new Date(trip.startDate); d <= end; d.setDate(d.getDate() + 1)) {
      traveledDays.add(d.toISOString().slice(0, 10));
    }
  });
  const daysCount = traveledDays.size;

  const citySet = new Set(
    tripSummaries
      .map((t) => {
        const parts = (t.name || "").trim().split(" ");
        return parts[parts.length - 1] || "";
      })
      .filter(Boolean)
  );
  const citiesCount = citySet.size;

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function tripDateStr(trip) {
    if (!trip.startDate || !trip.endDate) return "";
    const diff = Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000);
    const days = Math.max(1, diff + 1);
    const start = formatDate(trip.startDate);
    const end = formatDate(trip.endDate);
    return `${start} · ${end} · ${days} ${days === 1 ? "day" : "days"}`;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const recentTrips = tripSummaries
    .filter((t) => t.endDate && t.endDate <= todayStr)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 3)
    .map((trip) => ({ ...trip, dateStr: tripDateStr(trip) }));

  return (
    <ProfileView
      name={state.name}
      bio={state.bio}
      photoURL={state.photoURL}
      isEditing={state.isEditing}

      tripCount={tripCount}
      daysCount={daysCount}
      citiesCount={citiesCount}
      recentTrips={recentTrips}

      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}

      onNameChange={onNameChange}
      onBioChange={onBioChange}
      onImageChange={onImageChange}
      onRemovePhoto={onRemovePhoto}

      error={state.error}
    />
  );
}