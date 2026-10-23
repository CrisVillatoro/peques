import ScoutApp from "../components/ScoutApp";
import placesData from "../data/places.json";
import foodData from "../data/food.json";

export default function Page() {
  return <ScoutApp places={placesData.places} food={foodData.places} />;
}
