function choice(id, text) {
  return { id, text };
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffleChoices(choices, correctText) {
  const offset = Math.floor(Math.random() * choices.length);
  const shuffled = choices.slice(offset).concat(choices.slice(0, offset));
  const letters = ["A", "B", "C", "D"];
  return {
    choices: shuffled.map((text, index) => choice(letters[index], text)),
    correctAnswer: letters[shuffled.indexOf(correctText)]
  };
}

function baseQuestion(unit, topic, difficulty, type, patch) {
  return {
    type,
    unitId: unit.id,
    unitTitle: unit.title,
    topic,
    difficulty,
    prompt: "",
    choices: [],
    correctAnswer: "",
    rubric: [],
    explanation: "",
    wrongAnswerFeedback: { A: "", B: "", C: "", D: "" },
    graphHint: "",
    diagramSvg: "",
    questionKind: patch.questionKind || topic,
    cedAlignment: `${unit.title}: ${topic}`,
    ...patch
  };
}

function mcq(unit, topic, difficulty, prompt, correctText, distractors, explanation, graphHint, diagramSvg = "") {
  const { choices, correctAnswer } = shuffleChoices([correctText, ...distractors], correctText);
  const wrongAnswerFeedback = {};
  for (const option of choices) {
    wrongAnswerFeedback[option.id] =
      option.id === correctAnswer ? `Correct. ${explanation}` : `Not quite. ${explanation}`;
  }
  return baseQuestion(unit, topic, difficulty, "mcq", {
    prompt,
    choices,
    correctAnswer,
    rubric: ["Select the answer supported by the correct AP Physics C: E&M model."],
    explanation,
    wrongAnswerFeedback,
    graphHint,
    diagramSvg
  });
}

function frq(unit, topic, difficulty, prompt, correctAnswer, rubric, explanation, graphHint, diagramSvg = "") {
  return baseQuestion(unit, topic, difficulty, "frq", {
    prompt,
    correctAnswer,
    rubric,
    explanation,
    graphHint,
    diagramSvg
  });
}

function shellDiagram(radius, fieldDistance, charge) {
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Charged spherical shell with external field point">
    <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2457c5"/></marker></defs>
    <circle cx="145" cy="120" r="66" fill="#eef4ff" stroke="#2457c5" stroke-width="3"/>
    <circle cx="145" cy="120" r="4" fill="#17202a"/>
    <text x="111" y="45">${radius}R</text>
    <text x="112" y="126">+${charge}Q</text>
    <line x1="145" y1="120" x2="315" y2="120" stroke="#5d6b7a" stroke-dasharray="5 5"/>
    <circle cx="315" cy="120" r="6" fill="#b42318"/>
    <text x="305" y="101">P</text>
    <text x="210" y="146">${fieldDistance}R</text>
    <line x1="325" y1="120" x2="380" y2="120" stroke="#2457c5" stroke-width="3" marker-end="url(#arrow)"/>
    <text x="350" y="105">E</text>
  </svg>`;
}

function chargesDiagram(q1, q2) {
  return `<svg viewBox="0 0 420 210" role="img" aria-label="Two point charges and midpoint">
    <line x1="90" y1="105" x2="330" y2="105" stroke="#5d6b7a" stroke-width="2"/>
    <circle cx="90" cy="105" r="24" fill="#fff1f0" stroke="#b42318" stroke-width="3"/>
    <circle cx="330" cy="105" r="24" fill="#eef4ff" stroke="#2457c5" stroke-width="3"/>
    <circle cx="210" cy="105" r="5" fill="#17202a"/>
    <text x="64" y="111">+${q1}q</text>
    <text x="302" y="111">-${q2}q</text>
    <text x="186" y="86">midpoint</text>
    <text x="195" y="137">d/2</text>
    <text x="197" y="48">d</text>
  </svg>`;
}

function capacitorDiagram(label) {
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Parallel plate capacitor">
    <rect x="165" y="45" width="16" height="150" rx="2" fill="#2457c5"/>
    <rect x="240" y="45" width="16" height="150" rx="2" fill="#b42318"/>
    <text x="138" y="37">+Q</text>
    <text x="259" y="37">-Q</text>
    <line x1="181" y1="120" x2="240" y2="120" stroke="#5d6b7a" stroke-dasharray="5 5"/>
    <text x="200" y="112">d</text>
    <rect x="185" y="58" width="50" height="124" fill="#e8f7f2" stroke="#0f8b8d" stroke-width="2" opacity="0.9"/>
    <text x="192" y="131">kappa</text>
    <text x="124" y="218">${label}</text>
  </svg>`;
}

function circuitDiagram(r1, r2) {
  return `<svg viewBox="0 0 460 250" role="img" aria-label="Series circuit with two resistors">
    <path d="M90 65 H180 M280 65 H370 V190 H90 V65" fill="none" stroke="#17202a" stroke-width="3"/>
    <path d="M180 65 l10 -18 l20 36 l20 -36 l20 36 l20 -36 l10 18" fill="none" stroke="#2457c5" stroke-width="3"/>
    <text x="204" y="38">${r1}R</text>
    <path d="M170 190 l10 -18 l20 36 l20 -36 l20 36 l20 -36 l10 18" fill="none" stroke="#2457c5" stroke-width="3"/>
    <text x="194" y="232">${r2}R</text>
    <line x1="90" y1="116" x2="90" y2="148" stroke="#17202a" stroke-width="3"/>
    <line x1="72" y1="124" x2="108" y2="124" stroke="#17202a" stroke-width="3"/>
    <line x1="80" y1="140" x2="100" y2="140" stroke="#17202a" stroke-width="3"/>
    <text x="38" y="136">emf</text>
  </svg>`;
}

function magneticForceDiagram() {
  const crosses = Array.from({ length: 18 }, (_, i) => {
    const x = 55 + (i % 6) * 58;
    const y = 45 + Math.floor(i / 6) * 58;
    return `<g><line x1="${x - 7}" y1="${y - 7}" x2="${x + 7}" y2="${y + 7}" stroke="#5d6b7a" stroke-width="2"/><line x1="${x + 7}" y1="${y - 7}" x2="${x - 7}" y2="${y + 7}" stroke="#5d6b7a" stroke-width="2"/></g>`;
  }).join("");
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Positive charge moving in magnetic field into page">
    <defs><marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2457c5"/></marker><marker id="arrowRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#b42318"/></marker></defs>
    ${crosses}
    <circle cx="170" cy="125" r="18" fill="#fff7e7" stroke="#b7791f" stroke-width="3"/>
    <text x="164" y="132">+</text>
    <line x1="190" y1="125" x2="285" y2="125" stroke="#2457c5" stroke-width="3" marker-end="url(#arrowBlue)"/>
    <text x="229" y="112">v</text>
    <line x1="170" y1="105" x2="170" y2="48" stroke="#b42318" stroke-width="3" marker-end="url(#arrowRed)"/>
    <text x="181" y="75">F_B</text>
    <text x="285" y="198">B into page</text>
  </svg>`;
}

function inductionLoopDiagram() {
  const dots = Array.from({ length: 12 }, (_, i) => {
    const x = 80 + (i % 4) * 85;
    const y = 55 + Math.floor(i / 4) * 58;
    return `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#2457c5" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#2457c5"/>`;
  }).join("");
  return `<svg viewBox="0 0 420 250" role="img" aria-label="Loop in increasing outward magnetic field">
    <defs><marker id="arrowLoop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#b42318"/></marker></defs>
    ${dots}
    <rect x="130" y="55" width="160" height="130" rx="6" fill="none" stroke="#17202a" stroke-width="4"/>
    <path d="M210 42 C286 44 319 105 292 162" fill="none" stroke="#b42318" stroke-width="3" marker-end="url(#arrowLoop)"/>
    <text x="234" y="37">induced I</text>
    <text x="88" y="220">external B out of page, increasing</text>
  </svg>`;
}

const generators = {
  "unit-8": {
    mcq: (unit, topic, difficulty) => {
      const radius = pick([2, 3, 4, 5]);
      const charge = pick([3, 4, 6, 8]);
      return mcq(
        unit,
        topic,
        difficulty,
        `A thin spherical conducting shell of radius \\(${radius}R\\) carries net charge \\(+${charge}Q\\). A point P is located at a distance \\(${radius + 2}R\\) from the center of the shell. Which expression gives the magnitude of the electric field at P?`,
        `\\(\\dfrac{k(${charge}Q)}{(${radius + 2}R)^2}\\)`,
        [`\\(\\dfrac{k(${charge}Q)}{(${radius}R)^2}\\)`, `\\(0\\), because the charge resides on a conductor`, `\\(\\dfrac{kQ}{(${radius + 2}R)^2}\\)`],
        "Outside a spherically symmetric charged conductor, the field is the same as that of a point charge equal to the total charge at the center.",
        "Outside the shell, field lines are radial and the shell acts like a point charge at its center.",
        shellDiagram(radius, radius + 2, charge)
      );
    },
    frq: (unit, topic, difficulty) =>
      frq(
        unit,
        topic,
        difficulty,
        "A long insulating cylinder of radius \\(R\\) has volume charge density \\(\\rho(r)=\\alpha r\\) for \\(0\\le r\\le R\\). Derive an expression for the electric field magnitude inside the cylinder at radius \\(r<R\\), and state its direction.",
        "Using a coaxial Gaussian cylinder of length \\(L\\), \\[q_{\\text{enc}}=\\int_0^r \\alpha r'(2\\pi r'L)\\,dr'=\\frac{2\\pi\\alpha Lr^3}{3}.\\] Gauss's law gives \\[E(2\\pi rL)=\\frac{q_{\\text{enc}}}{\\epsilon_0},\\] so \\[E=\\frac{\\alpha r^2}{3\\epsilon_0},\\] directed radially outward for \\(\\alpha>0\\).",
        ["Chooses a coaxial cylindrical Gaussian surface.", "Correctly integrates enclosed charge.", "Applies Gauss's law to solve for \\(E(r)\\).", "States the radial direction and sign dependence."],
        "The charge density is not uniform, so enclosed charge requires an integral. Symmetry makes \\(E\\) constant on the curved surface.",
        "Draw a coaxial Gaussian cylinder and label \\(r\\), \\(R\\), \\(L\\), \\(\\vec E\\), and \\(d\\vec A\\)."
      )
  },
  "unit-9": {
    mcq: (unit, topic, difficulty) => {
      const [q1, q2] = pick([[2, 5], [3, 2], [5, 3], [4, 6]]);
      return mcq(
        unit,
        topic,
        difficulty,
        `Two point charges, \\(+${q1}q\\) and \\(-${q2}q\\), are separated by distance \\(d\\). What is the electric potential at the midpoint between the charges, taking \\(V=0\\) at infinity?`,
        `\\(\\dfrac{${2 * (q1 - q2)}kq}{d}\\)`,
        [`\\(\\dfrac{${q1 + q2}kq}{d}\\)`, `\\(0\\), because the midpoint is equidistant from both charges`, `\\(\\dfrac{${q1 - q2}kq}{d}\\)`],
        "Electric potential is a scalar sum. Each charge is \\(d/2\\) from the midpoint, so \\(V=k(+q_1q)/(d/2)+k(-q_2q)/(d/2)\\).",
        "Add scalar potentials; do not use vector cancellation.",
        chargesDiagram(q1, q2)
      );
    },
    frq: (unit, topic, difficulty) =>
      frq(
        unit,
        topic,
        difficulty,
        "A particle of charge \\(+q\\) and mass \\(m\\) is released from rest at point A where the electric potential is \\(V_A\\). It later passes point B where \\(V_B<V_A\\). Neglect non-electric forces. Derive the particle's speed at B.",
        "Conservation of energy gives \\[qV_A=qV_B+\\frac{1}{2}mv^2.\\] Therefore \\[v=\\sqrt{\\frac{2q(V_A-V_B)}{m}}.\\]",
        ["Uses \\(U=qV\\).", "Applies conservation of mechanical energy.", "Solves algebraically for speed.", "Explains why a positive charge speeds up moving to lower potential."],
        "Electric potential energy decreases and kinetic energy increases.",
        "Draw an energy bar chart showing electric potential energy converting into kinetic energy."
      )
  },
  "unit-10": {
    mcq: (unit, topic, difficulty) => {
      const kappa = pick([2, 3, 4]);
      return mcq(
        unit,
        topic,
        difficulty,
        `An isolated parallel-plate capacitor is charged and then disconnected from the battery. A dielectric with dielectric constant \\(\\kappa=${kappa}\\) is inserted so it completely fills the space between the plates. Which statement is correct?`,
        `The charge remains constant and the potential difference decreases by a factor of \\(${kappa}\\).`,
        [`The potential difference remains constant and the charge increases by a factor of \\(${kappa}\\).`, `Both charge and potential difference increase by a factor of \\(${kappa}\\).`, "The capacitance decreases because the dielectric blocks the electric field."],
        "Disconnected means charge is fixed. The dielectric increases capacitance by \\(\\kappa\\), so \\(V=Q/C\\) decreases by the same factor.",
        "The battery is absent after charging, so use fixed-charge reasoning.",
        capacitorDiagram("disconnected capacitor")
      );
    },
    frq: (unit, topic, difficulty) =>
      frq(
        unit,
        topic,
        difficulty,
        "A parallel-plate capacitor has plate area \\(A\\) and separation \\(d\\). It is connected to a battery of emf \\(V\\). Derive expressions for capacitance, stored charge, and stored energy. Then state how the stored energy changes if \\(d\\) is doubled while the battery remains connected.",
        "\\[C=\\frac{\\epsilon_0A}{d},\\qquad Q=CV=\\frac{\\epsilon_0AV}{d},\\qquad U=\\frac{1}{2}CV^2=\\frac{\\epsilon_0AV^2}{2d}.\\] If \\(d\\) is doubled while \\(V\\) remains fixed, \\(C\\) and \\(U\\) are each halved.",
        ["States \\(C=\\epsilon_0A/d\\).", "Uses \\(Q=CV\\).", "Uses \\(U=\\frac12CV^2\\).", "Handles the battery-connected condition correctly."],
        "The battery fixes potential difference, so use \\(U=\\frac{1}{2}CV^2\\), not fixed-charge reasoning.",
        "Draw plates connected to a battery and label \\(A\\), \\(d\\), \\(V\\), and charge signs.",
        capacitorDiagram("connected to battery")
      )
  },
  "unit-11": {
    mcq: (unit, topic, difficulty) => {
      const [r1, r2] = pick([[2, 4], [3, 6], [4, 8], [5, 10]]);
      return mcq(
        unit,
        topic,
        difficulty,
        `A battery of emf \\(\\mathcal E\\) is connected to two resistors, \\(${r1}R\\) and \\(${r2}R\\), in series. What is the current in the circuit?`,
        `\\(\\dfrac{\\mathcal E}{${r1 + r2}R}\\)`,
        [`\\(\\dfrac{\\mathcal E}{${r2 - r1}R}\\)`, `\\(\\dfrac{${r1 + r2}\\mathcal E}{R}\\)`, `\\(\\dfrac{\\mathcal E}{${r1 * r2}R}\\)`],
        "Series resistances add, so \\(R_{\\text{eq}}=R_1+R_2\\) and \\(I=\\mathcal E/R_{\\text{eq}}\\).",
        "Combine series resistors before applying Ohm's law.",
        circuitDiagram(r1, r2)
      );
    },
    frq: (unit, topic, difficulty) =>
      frq(
        unit,
        topic,
        difficulty,
        "A circuit contains an ideal battery of emf \\(\\mathcal E\\), a switch, a resistor \\(R\\), and an initially uncharged capacitor \\(C\\) in series. The switch is closed at \\(t=0\\). Derive expressions for \\(q(t)\\) and \\(I(t)\\).",
        "Kirchhoff's loop rule gives \\[\\mathcal E-\\frac{q}{C}-IR=0,\\qquad I=\\frac{dq}{dt}.\\] Thus \\[R\\frac{dq}{dt}+\\frac{q}{C}=\\mathcal E.\\] Solving with \\(q(0)=0\\), \\[q(t)=C\\mathcal E(1-e^{-t/RC}),\\qquad I(t)=\\frac{\\mathcal E}{R}e^{-t/RC}.\\]",
        ["Writes Kirchhoff's loop equation.", "Uses \\(I=dq/dt\\).", "Solves for \\(q(t)\\) with \\(q(0)=0\\).", "Obtains \\(I(t)\\)."],
        "Charging RC circuits often require setting up and solving a first-order differential equation.",
        "Draw the RC series loop and a \\(q\\)-versus-\\(t\\) curve approaching \\(C\\mathcal E\\)."
      )
  },
  "unit-12": {
    mcq: (unit, topic, difficulty) =>
      mcq(unit, topic, difficulty, "A positive charge moves to the right through a region where the magnetic field is directed into the page. What is the direction of the magnetic force on the charge?", "Upward on the page", ["Downward on the page", "To the right", "Into the page"], "For a positive charge, \\(\\vec F_B=q\\vec v\\times\\vec B\\). Right crossed into the page points upward.", "Use the right-hand rule with fingers along velocity and curled toward the magnetic field.", magneticForceDiagram()),
    frq: (unit, topic, difficulty) =>
      frq(unit, topic, difficulty, "A long straight wire carries current \\(I\\) upward. A rectangular loop of height \\(h\\) and width \\(w\\) lies in the plane of the page to the right of the wire, with its near side a distance \\(a\\) from the wire. Derive the magnetic flux through the loop.", "\\[B(r)=\\frac{\\mu_0I}{2\\pi r}.\\] With \\(dA=h\\,dr\\), \\[\\Phi_B=\\int_a^{a+w}\\frac{\\mu_0I}{2\\pi r}h\\,dr=\\frac{\\mu_0Ih}{2\\pi}\\ln\\left(\\frac{a+w}{a}\\right).\\]", ["Uses field from a long straight wire.", "Recognizes \\(B\\) varies with distance.", "Sets up the correct integral.", "Evaluates the logarithm."], "Because the field is not uniform over the loop, flux must be integrated over \\(r\\).", "Draw the wire, rectangular loop, \\(a\\), \\(w\\), \\(h\\), and field direction.")
  },
  "unit-13": {
    mcq: (unit, topic, difficulty) =>
      mcq(unit, topic, difficulty, "A conducting loop lies in the plane of the page. A uniform magnetic field directed out of the page is increasing in magnitude. What is the direction of the induced current in the loop?", "Clockwise", ["Counterclockwise", "There is no induced current", "Clockwise only if the loop is moving"], "Lenz's law says the induced current opposes the increasing outward flux, so it creates a field into the page. A clockwise current creates a field into the page.", "Use Lenz's law and the right-hand rule for the loop's induced magnetic field.", inductionLoopDiagram()),
    frq: (unit, topic, difficulty) =>
      frq(unit, topic, difficulty, "A conducting rod of length \\(L\\) moves to the right with speed \\(v\\) on frictionless rails in a uniform magnetic field \\(B\\) directed into the page. The rails are connected by a resistor \\(R\\). Derive the magnitude and direction of the induced current.", "\\[\\epsilon=BLv,\\qquad I=\\frac{\\epsilon}{R}=\\frac{BLv}{R}.\\] Positive charges in the rod experience \\(q\\vec v\\times\\vec B\\) upward, so conventional current is counterclockwise if the rod is the right side of the loop.", ["Identifies motional emf.", "Uses Ohm's law.", "Determines charge separation or flux-change direction.", "States current direction consistently."], "The result follows from magnetic force on charges or Faraday's law applied to changing loop area.", "Draw rails, rod velocity, magnetic field crosses, resistor, and induced current direction.")
  }
};

const allFallbacks = Object.values(generators);

function fluxLoopDiagram() {
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Tilted surface in uniform electric field">
    <defs><marker id="arrowFlux" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2457c5"/></marker></defs>
    <polygon points="145,70 295,100 250,175 100,145" fill="#eef4ff" stroke="#2457c5" stroke-width="3"/>
    <line x1="200" y1="122" x2="200" y2="48" stroke="#b42318" stroke-width="3" marker-end="url(#arrowFlux)"/>
    <text x="210" y="62">area vector</text>
    <line x1="60" y1="122" x2="355" y2="122" stroke="#0f8b8d" stroke-width="3" marker-end="url(#arrowFlux)"/>
    <text x="328" y="110">E</text>
    <path d="M205 72 A45 45 0 0 1 247 117" fill="none" stroke="#5d6b7a" stroke-width="2"/>
    <text x="230" y="92">theta</text>
  </svg>`;
}

function pointChargeTriangleDiagram() {
  return `<svg viewBox="0 0 420 240" role="img" aria-label="Three point charges on a right triangle">
    <line x1="115" y1="165" x2="305" y2="165" stroke="#5d6b7a" stroke-width="2"/>
    <line x1="115" y1="165" x2="115" y2="55" stroke="#5d6b7a" stroke-width="2"/>
    <line x1="115" y1="55" x2="305" y2="165" stroke="#5d6b7a" stroke-dasharray="5 5"/>
    <circle cx="115" cy="165" r="18" fill="#fff1f0" stroke="#b42318" stroke-width="3"/><text x="104" y="171">+q</text>
    <circle cx="305" cy="165" r="18" fill="#eef4ff" stroke="#2457c5" stroke-width="3"/><text x="295" y="171">-q</text>
    <circle cx="115" cy="55" r="18" fill="#fff7e7" stroke="#b7791f" stroke-width="3"/><text x="103" y="61">+Q</text>
    <text x="199" y="187">a</text><text x="82" y="113">a</text>
  </svg>`;
}

function rcCircuitDiagram() {
  return `<svg viewBox="0 0 460 250" role="img" aria-label="RC charging circuit">
    <path d="M95 65 H175 M275 65 H365 V190 H95 V65" fill="none" stroke="#17202a" stroke-width="3"/>
    <path d="M175 65 l10 -18 l20 36 l20 -36 l20 36 l20 -36 l10 18" fill="none" stroke="#2457c5" stroke-width="3"/>
    <text x="214" y="39">R</text>
    <line x1="215" y1="190" x2="215" y2="150" stroke="#b42318" stroke-width="4"/>
    <line x1="245" y1="190" x2="245" y2="150" stroke="#b42318" stroke-width="4"/>
    <text x="222" y="137">C</text>
    <line x1="95" y1="116" x2="95" y2="148" stroke="#17202a" stroke-width="3"/>
    <line x1="77" y1="124" x2="113" y2="124" stroke="#17202a" stroke-width="3"/>
    <line x1="85" y1="140" x2="105" y2="140" stroke="#17202a" stroke-width="3"/>
    <text x="43" y="136">emf</text>
  </svg>`;
}

function wireLoopDiagram() {
  return `<svg viewBox="0 0 440 250" role="img" aria-label="Long wire and rectangular loop">
    <defs><marker id="arrowWire" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#2457c5"/></marker></defs>
    <line x1="95" y1="205" x2="95" y2="45" stroke="#17202a" stroke-width="5" marker-end="url(#arrowWire)"/>
    <text x="58" y="55">I</text>
    <rect x="190" y="70" width="150" height="105" fill="none" stroke="#2457c5" stroke-width="4"/>
    <line x1="95" y1="190" x2="190" y2="190" stroke="#5d6b7a" stroke-dasharray="5 5"/>
    <text x="135" y="211">a</text>
    <text x="260" y="198">w</text>
    <text x="350" y="126">h</text>
    <text x="208" y="55">B varies with r</text>
  </svg>`;
}

const variantPools = {
  "unit-8": {
    mcq: [
      {
        kind: "Gauss's law: spherical symmetry",
        topics: ["Gauss's Law", "Electric fields of charge distributions", "Electric fields due to point charges and combinations of charges"],
        make: generators["unit-8"].mcq
      },
      {
        kind: "Electric flux through a surface",
        topics: ["Electric flux", "Gauss's Law"],
        make: (unit, topic, difficulty) => {
          const area = pick([2, 3, 4, 5]);
          return mcq(
            unit,
            topic,
            difficulty,
            `A flat surface of area \\(${area}A\\) is placed in a uniform electric field of magnitude \\(E\\). The angle between \\(\\vec E\\) and the surface's area vector is \\(\\theta\\). What is the electric flux through the surface?`,
            `\\(${area}EA\\cos\\theta\\)`,
            [`\\(${area}EA\\sin\\theta\\)`, `\\(EA\\cos\\theta/${area}\\)`, `\\(0\\), because the field is uniform`],
            "Electric flux is \\(\\Phi_E=\\vec E\\cdot\\vec A=EA\\cos\\theta\\), where \\(\\theta\\) is measured from the area vector, not from the surface plane.",
            "Identify the area vector before choosing sine or cosine.",
            fluxLoopDiagram()
          );
        }
      },
      {
        kind: "Coulomb force superposition",
        topics: ["Coulomb's Law", "Electric fields due to point charges and combinations of charges"],
        make: (unit, topic, difficulty) =>
          mcq(
            unit,
            topic,
            difficulty,
            "Two charges, \\(+q\\) and \\(-q\\), are fixed at adjacent corners of a square of side \\(a\\). A positive test charge \\(+Q\\) is placed at the corner directly above \\(+q\\). Which statement best describes the net electric force on \\(+Q\\)?",
            "It is the vector sum of a repulsive force from \\(+q\\) and an attractive force toward \\(-q\\).",
            ["It is zero because the source charges have equal magnitudes.", "It points directly away from \\(-q\\).", "It depends only on the nearest charge because electric forces do not superpose."],
            "Electric force obeys superposition. The forces from the two source charges must be added as vectors, and their directions are not generally collinear.",
            "Draw one force away from \\(+q\\) and one force toward \\(-q\\), then add components.",
            pointChargeTriangleDiagram()
          )
      }
    ],
    frq: [
      { kind: "Gauss's law derivation", topics: ["Gauss's Law", "Electric fields of charge distributions"], make: generators["unit-8"].frq },
      {
        kind: "Field from a charge distribution",
        topics: ["Electric fields of charge distributions", "Electric fields due to point charges and combinations of charges"],
        make: (unit, topic, difficulty) =>
          frq(
            unit,
            topic,
            difficulty,
            "A thin rod of length \\(L\\) has uniform positive charge \\(Q\\). Point P lies on the axis of the rod a distance \\(a\\) from the nearer end. Set up, but do not evaluate, an integral for the electric field magnitude at P.",
            "Let \\(x\\) measure distance from the nearer end of the rod, so \\(dq=(Q/L)dx\\) and the distance to P is \\(a+x\\). The field points along the axis and has magnitude \\[E=\\int_0^L \\frac{k(Q/L)}{(a+x)^2}\\,dx.\\]",
            ["Defines a coordinate and charge element.", "Writes the correct distance from each charge element to P.", "Uses \\(dE=k\\,dq/r^2\\).", "Sets correct limits and direction."],
            "This is a continuous-distribution problem, so it requires replacing a point-charge sum with an integral.",
            "Draw the rod, point P, coordinate \\(x\\), and distance \\(a+x\\)."
          )
      }
    ]
  },
  "unit-9": {
    mcq: [
      { kind: "Potential from point charges", topics: ["Electric potential", "Electric potential due to point charges and uniform fields", "Electric potential due to configurations of charge"], make: generators["unit-9"].mcq },
      {
        kind: "Energy conservation with potential",
        topics: ["Electric potential energy", "Conservation of electric energy"],
        make: (unit, topic, difficulty) =>
          mcq(unit, topic, difficulty, "A particle with charge \\(+q\\) is released from rest and moves from electric potential \\(3V_0\\) to \\(V_0\\). What is its kinetic energy at the lower-potential point?", `\\(2qV_0\\)`, [`\\(qV_0\\)`, `\\(3qV_0\\)`, `\\(-2qV_0\\)`], "The loss in electric potential energy becomes kinetic energy: \\(K=q(3V_0-V_0)=2qV_0\\).", "Use \\(\\Delta U=q\\Delta V\\) and energy conservation.")
      }
    ],
    frq: [{ kind: "Energy conservation derivation", topics: ["Electric potential energy", "Conservation of electric energy"], make: generators["unit-9"].frq }]
  },
  "unit-10": {
    mcq: [
      { kind: "Dielectric in isolated capacitor", topics: ["Dielectrics", "Capacitance", "Capacitors in circuits"], make: generators["unit-10"].mcq },
      {
        kind: "Capacitor scaling",
        topics: ["Capacitance", "Energy stored in capacitors"],
        make: (unit, topic, difficulty) =>
          mcq(unit, topic, difficulty, "A parallel-plate capacitor remains connected to a battery while the plate separation is doubled. Which quantities decrease?", "Capacitance, charge, and stored energy all decrease.", ["Only capacitance decreases.", "Only stored energy decreases.", "Charge stays fixed while energy increases."], "With the battery connected, \\(V\\) is fixed. Since \\(C=\\epsilon_0A/d\\), doubling \\(d\\) halves \\(C\\), \\(Q=CV\\), and \\(U=\\frac12CV^2\\).", "Decide first whether charge or voltage is fixed.")
      }
    ],
    frq: [{ kind: "Capacitor derivation", topics: ["Capacitance", "Energy stored in capacitors", "Capacitors in circuits"], make: generators["unit-10"].frq }]
  },
  "unit-11": {
    mcq: [
      { kind: "Series equivalent resistance", topics: ["Ohm's Law", "Series and parallel resistor circuits"], make: generators["unit-11"].mcq },
      {
        kind: "Kirchhoff junction rule",
        topics: ["Kirchhoff's junction and loop rules", "Current and resistance"],
        make: (unit, topic, difficulty) =>
          mcq(unit, topic, difficulty, "At a junction, currents \\(2I\\) and \\(3I\\) enter from two branches while current \\(I\\) leaves through a third branch. What current must leave through the fourth branch?", `\\(4I\\)`, [`\\(6I\\)`, `\\(2I\\)`, `\\(0\\)`], "Charge conservation requires total current entering the junction to equal total current leaving: \\(2I+3I=I+I_4\\).", "Use Kirchhoff's junction rule before considering resistance values.")
      }
    ],
    frq: [{ kind: "RC differential equation", topics: ["Steady-state DC circuits with batteries and resistors", "Kirchhoff's junction and loop rules"], make: generators["unit-11"].frq }]
  },
  "unit-12": {
    mcq: [
      { kind: "Right-hand rule: magnetic force", topics: ["Forces on moving charges in magnetic fields"], make: generators["unit-12"].mcq },
      {
        kind: "Magnetic field from a long wire",
        topics: ["Magnetic fields of long current-carrying wires", "Ampere's Law"],
        make: (unit, topic, difficulty) =>
          mcq(unit, topic, difficulty, "A long straight wire carries current \\(I\\). At distance \\(r\\), the magnetic field has magnitude \\(B\\). What is the field magnitude at distance \\(2r\\)?", `\\(B/2\\)`, [`\\(2B\\)`, `\\(B/4\\)`, `\\(B\\)`], "For a long straight wire, \\(B=\\mu_0I/(2\\pi r)\\), so the field is inversely proportional to distance.", "Use the functional dependence before plugging in numbers.")
      }
    ],
    frq: [{ kind: "Magnetic flux integral", topics: ["Magnetic fields of long current-carrying wires", "Biot-Savart Law", "Ampere's Law"], make: generators["unit-12"].frq }]
  },
  "unit-13": {
    mcq: [
      { kind: "Lenz's law direction", topics: ["Lenz's Law", "Faraday's Law", "Electromagnetic induction"], make: generators["unit-13"].mcq },
      {
        kind: "Motional emf magnitude",
        topics: ["Motional emf", "Faraday's Law"],
        make: (unit, topic, difficulty) =>
          mcq(unit, topic, difficulty, "A rod of length \\(L\\) moves with speed \\(v\\) perpendicular to a uniform magnetic field \\(B\\). What is the magnitude of the motional emf?", `\\(BLv\\)`, [`\\(Bv/L\\)`, `\\(BL/v\\)`, `\\(0\\), because the field is uniform`], "A moving rod sweeps area at rate \\(Lv\\), so \\(|\\epsilon|=B\\,dA/dt=BLv\\).", "A uniform field can still produce emf if the circuit area changes.")
      }
    ],
    frq: [{ kind: "Motional emf and induced current", topics: ["Motional emf", "Faraday's Law", "Lenz's Law"], make: generators["unit-13"].frq }]
  }
};

function chooseVariant(unitId, type, topic) {
  const variants = variantPools[unitId]?.[type];
  if (!variants?.length) return null;
  const matching = topic ? variants.filter((variant) => variant.topics.includes(topic)) : variants;
  return pick(matching.length ? matching : variants);
}

export function generateLocalQuestion(unit, topic, difficulty, type) {
  const variant = chooseVariant(unit.id, type, topic);
  if (variant) {
    const availableTopics = variant.topics.filter((item) => unit.topics.includes(item));
    const selectedTopic = topic || pick(availableTopics.length ? availableTopics : unit.topics);
    const question = variant.make(unit, selectedTopic, difficulty);
    return { ...question, questionKind: variant.kind, topic: selectedTopic };
  }
  const selectedTopic = topic || pick(unit.topics);
  const unitGenerator = generators[unit.id] || pick(allFallbacks);
  return unitGenerator[type](unit, selectedTopic, difficulty);
}
