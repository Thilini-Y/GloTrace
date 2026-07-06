# GloTrace — Travel Planning Assistant

> **Live App:** https://glotrace-63bb3.web.app/#/  
> **Git Repository:** https://gits-15.sys.kth.se/iprog-students/jingmeng-shunkang-tyka-vt26-project

---

## Short Description

GloTrace is a comprehensive travel planning assistant that helps users discover destinations, build itineraries, and revisit travel memories. Powered by the TripAdvisor Content API and Google Maps API, it transforms fragmented travel ideas into a seamless, structured experience — from searching a city to generating a day-by-day trip plan saved to the cloud.

---

## How to run

### Prerequisites

- [Node.js](https://nodejs.org/)
- A Firebase project with **Authentication** (Email/Password + Google) and **Firestore** enabled
- API keys for TripAdvisor, Google Maps, ImgBB, and the KTH DH2642 course proxy

- Clone the repository

```bash
git clone https://gits-15.sys.kth.se/iprog-students/jingmeng-shunkang-tyka-vt26-project.git
cd jingmeng-shunkang-tyka-vt26-project
```

- Install dependencies

```bash
npm install
```

- Start the development server

```bash
npm run dev
```

---

## 3rd party components

| Component | Where used in code |
|---|---|
| [**vue-draggable-plus**](https://www.npmjs.com/package/vue-draggable-plus)| `src/views/ItineraryView.jsx` wraps the waypoint list to enable drag-to-reorder of trip stops |
| [**Google Map**](https://developers.google.com/maps/documentation/javascript/add-google-map) | `src/presenters/ItineraryPresenter.jsx` — renders the interactive map|

## Group Members & Division of Work

| Member | Canvas ID | Responsibility |
|---|---|---|
| **Jingmeng Xie** | 198515 | Home page, Explore page, Search/Results/Detail/Sidebar views, TripAdvisor API integration, Pinia architecture, Firebase trip storage, project structure, Sharing feature |
| **Thilini Yashodha** | 198445 | Authentication flow (email + Google), Navigation bar, Profile page, Firestore user persistence, Image storage, Edit trip, Delete trip, Image loading, API call retry mechanism |
| **Shunkang Jia** | 198494 | Google Maps integration, Itinerary editor, Transport routing, Drag-and-drop reordering, Route polyline rendering, Profile history |

---
