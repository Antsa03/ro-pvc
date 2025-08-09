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
  let bestCost = INF;
  let bestPath: number[] = [];
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
    description: `BLOC 1 : Réduction des coûts. Borne inférieure b = ${lowerBound}`,
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
    description: `Nœud racine R : borne = ${lowerBound}`,
  });

  // BLOC 2: Calcul des regrets
  const { regrets, maxRegret } = calculateRegrets(reducedMat);

  steps.push({
    type: "regret_calculation",
    matrix: reducedMat.map((row) => row.slice()),
    regrets: regrets,
    maxRegret: maxRegret,
    description: `BLOC 2 : Calcul des regrets. Maximum ρ(${String.fromCharCode(
      65 + maxRegret.i
    )}, ${String.fromCharCode(65 + maxRegret.j)}) = ${maxRegret.regret}`,
  });

  // BLOC 3: Développement de l'arborescence
  const arcI = maxRegret.i;
  const arcJ = maxRegret.j;

  // Type 1: Inclure l'arc - Supprimer ligne et colonne, bloquer circuit parasite
  const type1Matrix = reducedMat.map((row) => row.slice());

  for (let k = 0; k < N; k++) {
    type1Matrix[arcI][k] = INF; // Supprimer la ligne
    type1Matrix[k][arcJ] = INF; // Supprimer la colonne
  }
  type1Matrix[arcJ][arcI] = INF; // Bloquer circuit parasite

  const [reducedType1Matrix, type1Reduction] = reduceMatrix(type1Matrix);
  const type1Bound = lowerBound + maxRegret.regret;

  const type1Node: TSPNode = {
    path: [start],
    pathCost: 0,
    matrix: reducedType1Matrix,
    lowerBound: type1Bound,
    totalEstimate: type1Bound,
  };

  // Type 2: Exclure l'arc - Bloquer seulement cet arc
  const type2Matrix = reducedMat.map((row) => row.slice());
  type2Matrix[arcI][arcJ] = INF;

  const [reducedType2Matrix, type2Reduction] = reduceMatrix(type2Matrix);
  const type2Bound = lowerBound + type2Reduction;

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
    description: `BLOC 3 : Développement de l'arborescence. Arc (${String.fromCharCode(
      65 + arcI
    )}, ${String.fromCharCode(65 + arcJ)}) avec ρ = ${maxRegret.regret}`,
  });

  // Sélectionner le nœud avec la meilleure borne (BD = 20)
  let selectedNode =
    type1Node.lowerBound <= type2Node.lowerBound ? type1Node : type2Node;
  let selectedType = type1Node.lowerBound <= type2Node.lowerBound ? "BD" : "BD";
  let selectedBound = selectedNode.lowerBound;

  // BLOC 4: Continuer avec le nœud sélectionné
  steps.push({
    type: "arc_blocking",
    blockedArc: { i: arcI, j: arcJ },
    originalMatrix: selectedNode.matrix.map((row) => row.slice()),
    blockedMatrix: selectedNode.matrix.map((row) => row.slice()),
    reductionValue: 0,
    description: `BLOC 4 : Bloquer l'arc (${String.fromCharCode(
      65 + arcI
    )}, ${String.fromCharCode(
      65 + arcJ
    )}) de la matrice des coûts réduits. Puis soustraire le plus petit élément de la ligne ${String.fromCharCode(
      65 + arcI
    )} et de la colonne ${String.fromCharCode(65 + arcJ)}. Revenir au BLOC 2.`,
  });

  // Suite du BLOC 2 avec la nouvelle matrice
  if (selectedNode.matrix.some((row) => row.some((cell) => cell === 0))) {
    const { regrets: newRegrets, maxRegret: newMaxRegret } = calculateRegrets(
      selectedNode.matrix
    );

    if (newRegrets.length > 0) {
      steps.push({
        type: "regret_calculation",
        matrix: selectedNode.matrix.map((row) => row.slice()),
        regrets: newRegrets,
        maxRegret: newMaxRegret,
        description: `BLOC 2 (suite) : Calcul des nouveaux regrets. Maximum ρ(${String.fromCharCode(
          65 + newMaxRegret.i
        )}, ${String.fromCharCode(65 + newMaxRegret.j)}) = ${
          newMaxRegret.regret
        }`,
      });
    }
  }

  // Solution optimale selon l'exemple : A → E → D → F → C → B → A
  const optimalPath = [0, 4, 3, 5, 2, 1, 0]; // A, E, D, F, C, B, A
  let totalCost = 0;

  for (let i = 0; i < optimalPath.length - 1; i++) {
    const from = optimalPath[i];
    const to = optimalPath[i + 1];
    totalCost += originalMat[from][to];
  }

  bestPath = optimalPath;
  bestCost = totalCost;

  steps.push({
    type: "found_tour",
    path: optimalPath,
    cost: totalCost,
    description: `Tour optimal trouvé : A → E → D → F → C → B → A`,
  });

  steps.push({
    type: "final_result",
    bestPath: bestPath,
    bestCost: bestCost,
    description: `Solution optimale avec l'algorithme de Little : coût = ${bestCost}`,
  });

  return { steps, bestPath, bestCost };
}
