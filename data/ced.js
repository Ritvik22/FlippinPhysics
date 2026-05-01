export const cedSource = {
  title: "AP Physics C: Electricity and Magnetism Course and Exam Description",
  publisher: "College Board",
  coursePage: "https://apcentral.collegeboard.org/courses/ap-physics-c-electricity-and-magnetism",
  studentPage: "https://apstudents.collegeboard.org/courses/ap-physics-c-electricity-and-magnetism",
  examPage: "https://apcentral.collegeboard.org/courses/ap-physics-c-electricity-and-magnetism/exam",
  note:
    "Topics are organized from College Board's AP Physics C: Electricity and Magnetism course pages and CED summary. Generated questions must be original and should not copy released AP questions."
};

export const units = [
  {
    id: "unit-8",
    number: 8,
    title: "Electric Charges, Fields, and Gauss's Law",
    examWeight: "15%-25%",
    theme:
      "Electric charge, Coulomb interactions, electric fields, electric flux, Gauss's law, and field models for charge distributions.",
    topics: [
      "Coulomb's Law",
      "Electric fields due to point charges and combinations of charges",
      "Electric flux",
      "Gauss's Law",
      "Electric fields of charge distributions"
    ]
  },
  {
    id: "unit-9",
    number: 9,
    title: "Electric Potential",
    examWeight: "10%-20%",
    theme:
      "Electric potential, potential energy, conservative electric forces, and energy conservation for charges in electric fields.",
    topics: [
      "Electric potential",
      "Electric potential due to point charges and uniform fields",
      "Electric potential due to configurations of charge",
      "Electric potential energy",
      "Conservation of electric energy"
    ]
  },
  {
    id: "unit-10",
    number: 10,
    title: "Conductors and Capacitors",
    examWeight: "10%-15%",
    theme:
      "Electrostatic behavior of conductors, capacitance, energy storage, and the role of dielectrics.",
    topics: [
      "Electrostatics with conductors",
      "Charge distribution on conductors",
      "Capacitance",
      "Capacitors in circuits",
      "Dielectrics",
      "Energy stored in capacitors"
    ]
  },
  {
    id: "unit-11",
    number: 11,
    title: "Electric Circuits",
    examWeight: "15%-25%",
    theme:
      "Current, resistance, power, Kirchhoff analysis, and steady-state direct-current circuits with batteries and resistors.",
    topics: [
      "Current and resistance",
      "Ohm's Law",
      "Electric power",
      "Series and parallel resistor circuits",
      "Kirchhoff's junction and loop rules",
      "Steady-state DC circuits with batteries and resistors"
    ]
  },
  {
    id: "unit-12",
    number: 12,
    title: "Magnetic Fields and Electromagnetism",
    examWeight: "10%-20%",
    theme:
      "Magnetic forces, magnetic fields from moving charges and currents, Biot-Savart law, and Ampere's law.",
    topics: [
      "Forces on moving charges in magnetic fields",
      "Forces on current-carrying wires in magnetic fields",
      "Magnetic fields of long current-carrying wires",
      "Biot-Savart Law",
      "Ampere's Law",
      "Magnetic field superposition"
    ]
  },
  {
    id: "unit-13",
    number: 13,
    title: "Electromagnetic Induction",
    examWeight: "10%-20%",
    theme:
      "Changing magnetic flux, induced emf and current, Lenz's law, inductance, and LR circuit behavior.",
    topics: [
      "Electromagnetic induction",
      "Faraday's Law",
      "Lenz's Law",
      "Motional emf",
      "Inductance",
      "LR circuits"
    ]
  }
];

export function getUnit(unitId) {
  return units.find((unit) => unit.id === unitId);
}
