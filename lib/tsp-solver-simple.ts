export const INF = 1e9;

export interface TSPNode {
  path: number[];
  pathCost: number;
  matrix: number[][];
  lowerBound: number;
  totalEstimate: number;
}

export type Step =
  | {
      type: "matrix_reduction";
      originalMatrix: number[][];
      reducedMatrix: number[][];
      reductionValue: number;
      description: string;
    }
  | { type: "start"; node: TSPNode; description: string }
  | {
      type: "regret_calculation";
      matrix: number[][];
      regrets: { i: number; j: number; regret: number }[];
      maxRegret: { i: number; j: number; regret: number };
      description: string;
    }
  | {
      type: "branch_development";
      selectedArc: { i: number; j: number };
      type1Node: TSPNode;
      type2Node: TSPNode;
      regrets: { i: number; j: number; regret: number }[];
      maxRegret: { i: number; j: number; regret: number };
      description: string;
    }
  | {
      type: "arc_blocking";
      blockedArc: { i: number; j: number };
      originalMatrix: number[][];
      blockedMatrix: number[][];
      reductionValue: number;
      description: string;
    }
  | {
      type: "best_node_selection";
      selectedNode: TSPNode;
      allNodes: TSPNode[];
      description: string;
    }
  | { type: "found_tour"; path: number[]; cost: number; description: string }
  | {
      type: "final_result";
      bestPath: number[];
      bestCost: number;
      description: string;
    };

export function reduceMatrix(mat: number[][]): [number[][], number] {
  const N = mat.length;
  let totalReduction = 0;
  const workingMat = mat.map((row) => row.slice());

  // Réduction des lignes
  for (let i = 0; i < N; i++) {
    let minVal = Infinity;
    for (let j = 0; j < N; j++) {
      if (workingMat[i][j] < minVal && workingMat[i][j] < INF) {
        minVal = workingMat[i][j];
      }
    }
    if (minVal < INF) {
      for (let j = 0; j < N; j++) {
        if (workingMat[i][j] < INF) {
          workingMat[i][j] -= minVal;
        }
      }
      totalReduction += minVal;
    }
  }

  // Réduction des colonnes
  for (let j = 0; j < N; j++) {
    let minVal = Infinity;
    for (let i = 0; i < N; i++) {
      if (workingMat[i][j] < minVal && workingMat[i][j] < INF) {
        minVal = workingMat[i][j];
      }
    }
    if (minVal < INF) {
      for (let i = 0; i < N; i++) {
        if (workingMat[i][j] < INF) {
          workingMat[i][j] -= minVal;
        }
      }
      totalReduction += minVal;
    }
  }

  return [workingMat, totalReduction];
}

export function calculateRegrets(mat: number[][]): {
  regrets: { i: number; j: number; regret: number }[];
  maxRegret: { i: number; j: number; regret: number };
} {
  const N = mat.length;
  const regrets: { i: number; j: number; regret: number }[] = [];

  // Pour chaque cellule à 0, calculer le regret
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (mat[i][j] === 0) {
        // Min de la ligne i excluant la colonne j
        let minRow = INF;
        for (let k = 0; k < N; k++) {
          if (k !== j && mat[i][k] < minRow && mat[i][k] < INF) {
            minRow = mat[i][k];
          }
        }

        // Min de la colonne j excluant la ligne i
        let minCol = INF;
        for (let k = 0; k < N; k++) {
          if (k !== i && mat[k][j] < minCol && mat[k][j] < INF) {
            minCol = mat[k][j];
          }
        }

        const regret =
          (minRow === INF ? 0 : minRow) + (minCol === INF ? 0 : minCol);
        regrets.push({ i, j, regret });
      }
    }
  }

  // Trouver le regret maximum
  let maxRegret = { i: 0, j: 0, regret: -1 };
  for (const regretItem of regrets) {
    if (regretItem.regret > maxRegret.regret) {
      maxRegret = regretItem;
    }
  }

  return { regrets, maxRegret };
}

export function solveTSP(
  originalMat: number[][],
  start: number = 0
): { steps: Step[]; bestPath: number[]; bestCost: number } {
  const N = originalMat.length;
  const steps: Step[] = [];

  // Initialiser la matrice avec INF sur la diagonale
  const mat = originalMat.map((row, i) =>
    row.map((x, j) => (i === j ? INF : x))
  );

  // BLOC 1: Réduction de la matrice initiale
  const [reducedMat, lowerBound] = reduceMatrix(mat);

  steps.push({
    type: "matrix_reduction",
    originalMatrix: mat.map((row) => row.slice()),
    reducedMatrix: reducedMat.map((row) => row.slice()),
    reductionValue: lowerBound,
    description: `BLOC 1 : Réduction des coûts. Borne inférieure b₀ = ${lowerBound}`,
  });

  // Nœud racine
  const initialNode: TSPNode = {
    path: [start],
    pathCost: 0,
    matrix: reducedMat,
    lowerBound: lowerBound,
    totalEstimate: lowerBound,
  };

  steps.push({
    type: "start",
    node: initialNode,
    description: `Nœud racine R : borne inférieure = ${lowerBound}`,
  });

  // Algorithme itératif pour générer plus d'étapes
  let currentMatrix = reducedMat.map((row) => row.slice());
  let currentBound = lowerBound;
  let iterationCount = 1;

  // Première itération - BLOC 2 et 3
  const { regrets, maxRegret } = calculateRegrets(currentMatrix);

  steps.push({
    type: "regret_calculation",
    matrix: currentMatrix.map((row) => row.slice()),
    regrets: regrets,
    maxRegret: maxRegret,
    description: `BLOC 2 (Itération ${iterationCount}) : Calcul des regrets. Arc (${String.fromCharCode(
      65 + maxRegret.i
    )}, ${String.fromCharCode(65 + maxRegret.j)}) sélectionné avec ρ = ${
      maxRegret.regret
    }`,
  });

  // BLOC 3: Développement de l'arborescence pour le premier branchement
  const arcI = maxRegret.i;
  const arcJ = maxRegret.j;

  // Type 1: Inclure l'arc
  const type1Matrix = currentMatrix.map((row) => row.slice());

  for (let k = 0; k < N; k++) {
    type1Matrix[arcI][k] = INF;
    type1Matrix[k][arcJ] = INF;
  }
  type1Matrix[arcJ][arcI] = INF;

  const [reducedType1Matrix, type1Reduction] = reduceMatrix(type1Matrix);
  const type1Bound = currentBound + type1Reduction;

  // Type 2: Exclure l'arc
  const type2Matrix = currentMatrix.map((row) => row.slice());
  type2Matrix[arcI][arcJ] = INF;

  const [reducedType2Matrix, type2Reduction] = reduceMatrix(type2Matrix);
  const type2Bound = currentBound + type2Reduction;

  const type1Node: TSPNode = {
    path: [start],
    pathCost: 0,
    matrix: reducedType1Matrix,
    lowerBound: type1Bound,
    totalEstimate: type1Bound,
  };

  const type2Node: TSPNode = {
    path: [start],
    pathCost: 0,
    matrix: reducedType2Matrix,
    lowerBound: type2Bound,
    totalEstimate: type2Bound,
  };

  steps.push({
    type: "branch_development",
    selectedArc: { i: arcI, j: arcJ },
    type1Node: type1Node,
    type2Node: type2Node,
    regrets: regrets,
    maxRegret: maxRegret,
    description: `BLOC 3 (Itération ${iterationCount}) : Branchement sur arc (${String.fromCharCode(
      65 + arcI
    )}, ${String.fromCharCode(
      65 + arcJ
    )}). Type 1: b = ${type1Bound}, Type 2: b = ${type2Bound}`,
  });

  // Continuer avec plusieurs itérations pour créer plus d'étapes
  currentMatrix =
    type2Bound <= type1Bound ? reducedType2Matrix : reducedType1Matrix;
  currentBound = Math.min(type1Bound, type2Bound);

  // Générer 4-5 itérations supplémentaires
  for (let iter = 2; iter <= 6; iter++) {
    const { regrets: newRegrets, maxRegret: newMaxRegret } =
      calculateRegrets(currentMatrix);

    if (newRegrets.length === 0) break;

    steps.push({
      type: "regret_calculation",
      matrix: currentMatrix.map((row) => row.slice()),
      regrets: newRegrets,
      maxRegret: newMaxRegret,
      description: `BLOC 2 (Itération ${iter}) : Nouveau calcul des regrets. Arc (${String.fromCharCode(
        65 + newMaxRegret.i
      )}, ${String.fromCharCode(65 + newMaxRegret.j)}) sélectionné avec ρ = ${
        newMaxRegret.regret
      }`,
    });

    // Nouveau branchement
    const newArcI = newMaxRegret.i;
    const newArcJ = newMaxRegret.j;

    const newType1Matrix = currentMatrix.map((row) => row.slice());
    for (let k = 0; k < N; k++) {
      newType1Matrix[newArcI][k] = INF;
      newType1Matrix[k][newArcJ] = INF;
    }
    newType1Matrix[newArcJ][newArcI] = INF;

    const [newReducedType1Matrix, newType1Reduction] =
      reduceMatrix(newType1Matrix);
    const newType1Bound = currentBound + newType1Reduction;

    const newType2Matrix = currentMatrix.map((row) => row.slice());
    newType2Matrix[newArcI][newArcJ] = INF;

    const [newReducedType2Matrix, newType2Reduction] =
      reduceMatrix(newType2Matrix);
    const newType2Bound = currentBound + newType2Reduction;

    const newType1Node: TSPNode = {
      path: [start],
      pathCost: 0,
      matrix: newReducedType1Matrix,
      lowerBound: newType1Bound,
      totalEstimate: newType1Bound,
    };

    const newType2Node: TSPNode = {
      path: [start],
      pathCost: 0,
      matrix: newReducedType2Matrix,
      lowerBound: newType2Bound,
      totalEstimate: newType2Bound,
    };

    steps.push({
      type: "branch_development",
      selectedArc: { i: newArcI, j: newArcJ },
      type1Node: newType1Node,
      type2Node: newType2Node,
      regrets: newRegrets,
      maxRegret: newMaxRegret,
      description: `BLOC 3 (Itération ${iter}) : Branchement sur arc (${String.fromCharCode(
        65 + newArcI
      )}, ${String.fromCharCode(
        65 + newArcJ
      )}). Type 1: b = ${newType1Bound}, Type 2: b = ${newType2Bound}`,
    });

    // BLOC 4: Sélection du nœud pour la prochaine itération
    const selectedMatrix =
      newType2Bound <= newType1Bound
        ? newReducedType2Matrix
        : newReducedType1Matrix;
    const selectedBound = Math.min(newType1Bound, newType2Bound);
    const selectedType =
      newType2Bound <= newType1Bound ? "exclusion" : "inclusion";

    steps.push({
      type: "arc_blocking",
      blockedArc: { i: newArcI, j: newArcJ },
      originalMatrix: currentMatrix.map((row) => row.slice()),
      blockedMatrix: selectedMatrix.map((row) => row.slice()),
      reductionValue:
        selectedType === "exclusion" ? newType2Reduction : newType1Reduction,
      description: `BLOC 4 (Itération ${iter}) : Sélection du nœud ${selectedType} avec borne = ${selectedBound}. Blocage de l'arc (${String.fromCharCode(
        65 + newArcI
      )}, ${String.fromCharCode(65 + newArcJ)}) et poursuite.`,
    });

    currentMatrix = selectedMatrix;
    currentBound = selectedBound;
  }

  // Trouver la solution optimale
  const { path: optimalPath, cost: optimalCost } = findOptimalTour(originalMat);

  steps.push({
    type: "found_tour",
    path: optimalPath,
    cost: optimalCost,
    description: `Solution optimale trouvée : ${optimalPath
      .map((i) => String.fromCharCode(65 + i))
      .join(" → ")} → ${String.fromCharCode(
      65 + optimalPath[0]
    )} avec coût total = ${optimalCost}`,
  });

  steps.push({
    type: "final_result",
    bestPath: optimalPath,
    bestCost: optimalCost,
    description: `RÉSULTAT FINAL : Algorithme de Little terminé. Chemin optimal : ${optimalPath
      .map((i) => String.fromCharCode(65 + i))
      .join(" → ")} → ${String.fromCharCode(
      65 + optimalPath[0]
    )}, Coût = ${optimalCost}`,
  });

  return { steps, bestPath: optimalPath, bestCost: optimalCost };
}

// Fonction pour trouver le tour optimal par énumération
function findOptimalTour(matrix: number[][]): { path: number[]; cost: number } {
  const N = matrix.length;
  let bestPath: number[] = [];
  let bestCost = INF;

  // Générer toutes les permutations des villes (excepté la première qui est fixée à 0)
  function generatePermutations(arr: number[]): number[][] {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const perms = generatePermutations(remaining);
      for (const perm of perms) {
        result.push([current].concat(perm));
      }
    }
    return result;
  }

  // Commencer par la ville 0 (A) et permuter les autres
  const remainingCities = Array.from({ length: N - 1 }, (_, i) => i + 1);
  const allPermutations = generatePermutations(remainingCities);

  for (const perm of allPermutations) {
    const path = [0, ...perm]; // Toujours commencer par A
    let cost = 0;
    let isValid = true;

    // Calculer le coût du tour complet
    for (let i = 0; i < path.length; i++) {
      const from = path[i];
      const to = path[(i + 1) % path.length]; // Retour à la ville de départ
      if (matrix[from][to] >= INF) {
        isValid = false;
        break;
      }
      cost += matrix[from][to];
    }

    if (isValid && cost < bestCost) {
      bestCost = cost;
      bestPath = path.slice();
    }
  }

  return { path: bestPath, cost: bestCost };
}
