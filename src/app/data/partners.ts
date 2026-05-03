import western from "../../imports/partners/western-logo.png";
import alkhorayef from "../../imports/partners/alkhorayef.png";
import komet from "../../imports/partners/komet.png";
import nelson from "../../imports/partners/nelsonLogo.png";
import senninger from "../../imports/partners/senninger.png";
import umc from "../../imports/partners/umc-logo.png";

export type Partner = { name: string; logo: string; tag?: string };

export const partners: Partner[] = [
  { name: "Western Irrigation", logo: western, tag: "Pivots Centraux" },
  { name: "Alkhorayef", logo: alkhorayef, tag: "Fabricant" },
  { name: "Komet", logo: komet, tag: "Asperseurs" },
  { name: "Nelson", logo: nelson, tag: "Asperseurs" },
  { name: "Senninger", logo: senninger, tag: "Asperseurs" },
  { name: "UMC", logo: umc, tag: "Motoréducteurs" },
];
