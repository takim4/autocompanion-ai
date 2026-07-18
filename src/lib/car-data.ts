export const CAR_BRANDS = [
  "Audi", "BMW", "Chevrolet", "Citroen", "Dacia", "Fiat", "Ford", "Honda",
  "Hyundai", "Kia", "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan", "Opel",
  "Peugeot", "Renault", "Seat", "Skoda", "Subaru", "Suzuki", "Tesla", "Toyota",
  "Volkswagen", "Volvo",
] as const;

export const POPULAR_MODELS: Record<string, string[]> = {
  Volkswagen: ["Golf", "Passat", "Polo", "Tiguan", "Jetta", "Touran"],
  BMW: ["1 Serisi", "3 Serisi", "5 Serisi", "X1", "X3", "X5"],
  "Mercedes-Benz": ["A-Serisi", "C-Serisi", "E-Serisi", "GLA", "GLC", "GLE"],
  Ford: ["Focus", "Fiesta", "Mondeo", "Kuga", "Puma", "Transit"],
  Toyota: ["Corolla", "Yaris", "C-HR", "RAV4", "Auris", "Camry"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Symbol", "Fluence"],
  Hyundai: ["i10", "i20", "i30", "Tucson", "Kona", "Accent"],
  Opel: ["Astra", "Corsa", "Insignia", "Mokka", "Grandland"],
  Fiat: ["Egea", "Panda", "500", "Doblo", "Tipo"],
  Peugeot: ["208", "308", "3008", "2008", "5008", "508"],
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7"],
  Dacia: ["Sandero", "Duster", "Logan", "Jogger"],
  Honda: ["Civic", "Jazz", "CR-V", "HR-V"],
  Kia: ["Rio", "Sportage", "Ceed", "Picanto"],
  Nissan: ["Qashqai", "Juke", "Micra", "X-Trail"],
  Skoda: ["Octavia", "Fabia", "Superb", "Kodiaq"],
  Seat: ["Leon", "Ibiza", "Ateca", "Arona"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
};

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) =>
  CURRENT_YEAR - i,
);

export const FUEL_LABELS: Record<string, string> = {
  gasoline: "Benzin",
  diesel: "Dizel",
  lpg: "LPG",
  hybrid: "Hibrit",
  electric: "Elektrik",
  other: "Diğer",
};

export const TRANSMISSION_LABELS: Record<string, string> = {
  manual: "Manuel",
  automatic: "Otomatik",
  semi_automatic: "Yarı Otomatik",
  cvt: "CVT",
  dct: "DCT",
};
