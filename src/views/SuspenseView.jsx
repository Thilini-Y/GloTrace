import loadingGif from "../assets/loader.gif";

export default function SuspenseView() {
  return <img src={loadingGif} className="loading-img" />;
}
