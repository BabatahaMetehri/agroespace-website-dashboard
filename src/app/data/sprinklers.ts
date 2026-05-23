import komet from "../../imports/partners/komet.png";
import nelson from "../../imports/partners/nelsonLogo.png";
import senninger from "../../imports/partners/senninger.png";

export type SprinklerBrand = {
  id: "senninger" | "komet" | "nelson";
  name: string;
  logo: string;
};

/** Sprinkler brands offered with the central pivot systems. */
export const sprinklers: SprinklerBrand[] = [
  { id: "senninger", name: "Senninger", logo: senninger },
  { id: "komet", name: "Komet", logo: komet },
  { id: "nelson", name: "Nelson", logo: nelson },
];

export const sprinklerById = (id?: string | null): SprinklerBrand | undefined =>
  sprinklers.find((s) => s.id === id);
