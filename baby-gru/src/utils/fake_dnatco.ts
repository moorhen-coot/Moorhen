const NTC_CLASSES = [
  {
    name: "AA",
    angles: { alpha: -60, beta: 180, gamma: 60, delta: 85,  epsilon: -160, zeta: -60,  chi: -160 }
  },
  {
    name: "BB",
    angles: { alpha: -60, beta: 180, gamma: 60, delta: 140, epsilon: -160, zeta: -60,  chi: -110 }
  },
  {
    name: "B1",
    angles: { alpha: -70, beta: 170, gamma: 50, delta: 145, epsilon: -150, zeta: -70,  chi: -115 }
  },
  {
    name: "B2",
    angles: { alpha: -65, beta: 175, gamma: 55, delta: 150, epsilon: -170, zeta: -80,  chi: -105 }
  },
  {
    name: "S1",
    angles: { alpha: -80, beta: 160, gamma: 70, delta: 130, epsilon: -140, zeta: -60,  chi: 60 }
  },
  {
    name: "S2",
    angles: { alpha: -90, beta: 150, gamma: 80, delta: 120, epsilon: -130, zeta: -50,  chi: 50 }
  },
  {
    name: "Z1",
    angles: { alpha: -150, beta: 160, gamma: -60, delta: 90, epsilon: 160, zeta: 60, chi: 60 }
  }
];

const deriveBackboneFeatures = (angles) => {
  const { delta, epsilon, zeta, chi } = angles;

  // Normalize epsilon − zeta into [-180, 180]
  let epsMinusZeta = epsilon - zeta;
  epsMinusZeta = ((epsMinusZeta + 180) % 360) - 180;

  return {
    chi,
    delta,
    epsMinusZeta,

    isSyn: chi > -90 && chi < 90,
    isBII: epsMinusZeta > 0,
    isAForm: delta > 60 && delta < 100,
    isBForm: delta > 120 && delta < 160,
    isIntermediate: delta >= 100 && delta <= 120
  };
}

const angleDiff = (a, b) => {
    let d = Math.abs(a - b) % 360;  return d > 180 ? 360 - d : d;
}

const ntcDistance = (t1, t2) => {
  return Math.sqrt(
    Math.pow(angleDiff(t1.alpha, t2.alpha), 2) +
    Math.pow(angleDiff(t1.beta,  t2.beta),  2) +
    Math.pow(angleDiff(t1.gamma, t2.gamma), 2) +
    Math.pow(angleDiff(t1.delta, t2.delta), 2) +
    Math.pow(angleDiff(t1.epsilon, t2.epsilon), 2) +
    Math.pow(angleDiff(t1.zeta, t2.zeta), 2) +
    Math.pow(angleDiff(t1.chi, t2.chi), 2)
  );
}

const classifyNtC = (inputAngles) => {
  let best = null;
  let bestDist = Infinity;

  for (const ntc of NTC_CLASSES) {
    const d = ntcDistance(inputAngles, ntc.angles);

    if (d < bestDist) {
      bestDist = d;
      best = ntc.name;
    }
  }

  return { ntc: best, distance: bestDist };
}

const mapNtCtoClass = (ntc, angles, distance) => {
  const f = deriveBackboneFeatures(angles);

  // ---- 1. SYN (highest priority) ----
  if (f.isSyn) {
    return "SYN";
  }

  // ---- 2. Z-DNA ----
  if (ntc.startsWith("Z")) {
    return "Z";
  }

  // ---- 3. OPN (very distorted) ----
  // Usually far from any cluster or irregular geometry
  if (distance > 120) {
    return "OPN";
  }

  // ---- 4. A-form ----
  if (f.isAForm && ntc.startsWith("A")) {
    return "A";
  }

  // ---- 5. BII ----
  if (f.isBForm && f.isBII) {
    return "BII";
  }

  // ---- 6. B / miB ----
  if (f.isBForm) {
    if (ntc === "BB") return "B";
    if (ntc.startsWith("B")) return "miB";
  }

  // ---- 7. Intermediate (IC) ----
  if (f.isIntermediate || ntc.startsWith("I")) {
    return "IC";
  }

  // ---- 8. Explicit OPN classes ----
  if (ntc.startsWith("O")) {
    return "OPN";
  }

  // ---- 9. Fallback ----
  if (ntc.startsWith("A")) return "A";
  if (ntc.startsWith("B")) return "B";

  return "N";
}

const colourFromClass = (cls) => {
  switch (cls) {
    case "A":   return "yellow";
    case "B":   return "lightblue";
    case "BII": return "darkblue";
    case "miB": return "cyan";
    case "Z":   return "green";
    case "IC":  return "magenta";
    case "OPN": return "red";
    case "SYN": return "orange";
    default:    return "grey"; // N
  }
}

export const nucleotideToColour = (nuc) => {
   const result = classifyNtC(nuc);
   const geomClass = mapNtCtoClass(result.ntc, nuc, result.distance);
   const colour = colourFromClass(geomClass)
   return colour
}

/*
const nucleotide = {
  alpha: -60,
  beta: 180,
  gamma: 60,
  delta: 145,
  epsilon: -80,
  zeta: -100,
  chi: -110
};

const colour = nucleotideToColour(nucleotide)

console.log(colour);
*/

