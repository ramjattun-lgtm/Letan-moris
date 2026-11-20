// River watch: main rivers, where their rain comes from (upstream), and who lives downstream.
// "upstream" points are APPROXIMATE spots in each river's upper catchment, used only to read the rain
// forecast there. They are not catchment boundaries. Flood-prone sector ids refer to src/data/flood-sites.ts.

export interface River {
  id: string;
  name: string;
  island: "mauritius" | "rodrigues";
  upstream: { lat: number; lon: number }[];
  upstreamText: string; // where the rain that feeds it falls
  downstream: string[]; // locality ids at risk if the river rises
  downstreamText: string;
  floodSites?: string[];
  outings?: string[]; // popular river / waterfall spots
}

export const RIVERS: River[] = [
  {
    id: "pouce",
    name: "Rivière du Pouce",
    island: "mauritius",
    upstream: [{ lat: -20.195, lon: 57.53 }],
    upstreamText: "the Moka range around Le Pouce",
    downstream: ["port-louis"],
    downstreamText: "Port Louis (Plaine Verte, the city centre and the canals)",
    floodSites: ["S75", "S74"],
  },
  {
    id: "lataniers",
    name: "Rivière Lataniers",
    island: "mauritius",
    upstream: [{ lat: -20.17, lon: 57.535 }],
    upstreamText: "the hills between Montagne Longue and Le Pouce",
    downstream: ["port-louis", "baie-du-tombeau"],
    downstreamText: "Port Louis north (Vallée des Prêtres, Roche Bois, Cité La Cure)",
    floodSites: ["S73", "S72"],
  },
  {
    id: "grnw",
    name: "Grande Rivière Nord-Ouest",
    island: "mauritius",
    upstream: [
      { lat: -20.27, lon: 57.51 },
      { lat: -20.22, lon: 57.5 },
    ],
    upstreamText: "the central plateau around Vacoas, Quatre Bornes and Beau Bassin",
    downstream: ["rose-hill", "port-louis"],
    downstreamText: "the valley below Beau Bassin and Pointe aux Sables / Port Louis west",
    floodSites: ["S78", "S85"],
  },
  {
    id: "grse",
    name: "Grand River South East",
    island: "mauritius",
    upstream: [
      { lat: -20.3, lon: 57.59 },
      { lat: -20.28, lon: 57.65 },
    ],
    upstreamText: "the Midlands and the eastern plateau",
    downstream: ["bel-air", "quatre-cocos"],
    downstreamText: "the Grande Rivière Sud-Est valley and coast",
    outings: ["GRSE waterfall boat trips"],
  },
  {
    id: "rempart",
    name: "Rivière du Rempart",
    island: "mauritius",
    upstream: [{ lat: -20.15, lon: 57.64 }],
    upstreamText: "the area around La Nicolière and Piton du Milieu",
    downstream: ["riviere-du-rempart", "poudre-dor"],
    downstreamText: "Rivière du Rempart and Poudre d'Or",
    floodSites: ["S01"],
  },
  {
    id: "noire",
    name: "Rivière Noire",
    island: "mauritius",
    upstream: [{ lat: -20.4, lon: 57.44 }],
    upstreamText: "Plaine Champagne and the Black River Gorges",
    downstream: ["black-river", "tamarin"],
    downstreamText: "Rivière Noire village and the west coast",
    outings: ["Black River Gorges trails and falls", "Alexandra Falls"],
  },
  {
    id: "tamarin",
    name: "Rivière Tamarin",
    island: "mauritius",
    upstream: [{ lat: -20.36, lon: 57.48 }],
    upstreamText: "Mare aux Vacoas and Tamarind Falls",
    downstream: ["tamarin", "flic-en-flac"],
    downstreamText: "Tamarin and the west coast",
    outings: ["Tamarind Falls / 7 Cascades"],
  },
  {
    id: "creoles",
    name: "Rivière des Créoles",
    island: "mauritius",
    upstream: [{ lat: -20.35, lon: 57.62 }],
    upstreamText: "the south-eastern plateau",
    downstream: ["mahebourg"],
    downstreamText: "the Grand Port coast north of Mahébourg",
    floodSites: ["S25-102"],
  },
  {
    id: "lachaux",
    name: "Rivière La Chaux",
    island: "mauritius",
    upstream: [{ lat: -20.37, lon: 57.62 }],
    upstreamText: "Nouvelle France and the southern plateau",
    downstream: ["mahebourg", "rose-belle"],
    downstreamText: "Mahébourg",
    floodSites: ["S47"],
  },
  {
    id: "savanne",
    name: "Rivière Savanne",
    island: "mauritius",
    upstream: [{ lat: -20.43, lon: 57.53 }],
    upstreamText: "the southern hills above Souillac",
    downstream: ["souillac", "surinam"],
    downstreamText: "Souillac",
    outings: ["Rochester Falls"],
  },
  {
    id: "rodrigues-north",
    name: "Streams from Mont Limon (Rodrigues)",
    island: "rodrigues",
    upstream: [{ lat: -19.71, lon: 63.42 }],
    upstreamText: "the central ridge around Mont Limon",
    downstream: ["port-mathurin", "baie-aux-huitres"],
    downstreamText: "Port Mathurin and the north coast",
  },
];
