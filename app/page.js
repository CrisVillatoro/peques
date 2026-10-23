import PequesApp from "../components/PequesApp";
import placesData from "../data/places.json";
import foodData from "../data/food.json";

export default function Page() {
  return <PequesApp places={placesData.places} food={foodData.places} />;
}
