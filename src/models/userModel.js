export const userModel = {
  user: undefined,
  ready: false,
  promiseState: {
    promise: null,
    error: null
  },
  profile: {
    name: "",
    bio: "",
    photoURL: ""
  },
  tripSummaries: [],


  updateProfile({ name, bio, photoURL }) {
    this.profile.name = name;
    this.profile.bio = bio;
    this.profile.photoURL = photoURL;
  },

  removeTripSummary(id) {
    this.tripSummaries = this.tripSummaries.filter(s => s.id !== id);
  },

};