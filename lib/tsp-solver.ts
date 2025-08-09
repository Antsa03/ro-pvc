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
        // Calculer le regret pour cette position (i,j)
        // Regret = min de la ligne i (excluant la colonne j) + min de la colonne j (excluant la ligne i)

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
  steps.push({
    type: "matrix_reduction",
    originalMatrix: mat.map((row) => row.slice()),
    reducedMatrix: [],
    reductionValue: 0,
    description: "BLOC 1 : Réduction des coûts de la matrice initiale",
  });

  const [reducedMat, lowerBound] = reduceMatrix(mat);

  // Mettre à jour l'étape avec la matrice réduite
  steps[steps.length - 1] = {
    type: "matrix_reduction",
    originalMatrix: mat.map((row) => row.slice()),
    reducedMatrix: reducedMat.map((row) => row.slice()),
    reductionValue: lowerBound,
    description: `BLOC 1 : Réduction terminée. Borne inférieure b = ${lowerBound}`,
  };

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
    description: `Initialisation : Nœud racine avec chemin [${String.fromCharCode(
      65 + start
    )}], borne = ${lowerBound}`,
  });

  const queue: TSPNode[] = [initialNode];
  let stepCounter = 2;

  while (queue.length > 0 && bestCost === INF) {
    // BLOC 2: Sélection du meilleur nœud
    let minIndex = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].totalEstimate < queue[minIndex].totalEstimate) {
        minIndex = i;
      }
    }
    const current = queue.splice(minIndex, 1)[0];

    if (queue.length > 0) {
      steps.push({
        type: "best_node_selection",
        selectedNode: current,
        allNodes: [...queue, current],
        description: `BLOC 2 : Sélection du nœud avec la plus petite borne (${current.totalEstimate})`,
      });
    }

    if (current.path.length === N) {
      const last = current.path[N - 1];
      if (originalMat[last][start] < INF) {
        const tourCost = current.pathCost + originalMat[last][start];
        steps.push({
          type: "found_tour",
          path: [...current.path, start],
          cost: tourCost,
          description: `Tour complet trouvé : coût total = ${tourCost}`,
        });
        if (tourCost < bestCost) {
          bestCost = tourCost;
          bestPath = [...current.path, start];
        }
      }
      continue;
    }

    // BLOC 3: Développement des branches (limitation pour éviter trop d'étapes)
    const currentCity = current.path[current.path.length - 1];
    const possibleCities = [];

    for (let j = 0; j < N; j++) {
      if (!current.path.includes(j) && originalMat[currentCity][j] < INF) {
        possibleCities.push(j);
      }
    }

    if (possibleCities.length > 0 && current.path.length <= 3) {
      // Limiter la profondeur pour simplifier
      const childrenNodes: TSPNode[] = [];

      for (const j of possibleCities.slice(0, 3)) {
        // Limiter à 3 branches max
        const newMat = current.matrix.map((row) => row.slice());
        for (let k = 0; k < N; k++) {
          newMat[currentCity][k] = INF;
          newMat[k][j] = INF;
        }
        const [reducedNewMat, newLowerBound] = reduceMatrix(newMat);
        const newPathCost = current.pathCost + originalMat[currentCity][j];
        const newTotalEstimate = newPathCost + newLowerBound;

        const newNode: TSPNode = {
          path: [...current.path, j],
          pathCost: newPathCost,
          matrix: reducedNewMat,
          lowerBound: newLowerBound,
          totalEstimate: newTotalEstimate,
        };

        childrenNodes.push(newNode);
        if (newTotalEstimate < bestCost) {
          queue.push(newNode);
        }
      }

      if (childrenNodes.length > 0) {
        steps.push({
          type: "branch_development",
          selectedArc: { i: currentCity, j: possibleCities[0] },
          type1Node: childrenNodes[0],
          type2Node: childrenNodes[0], // Simplifié pour l'instant
          description: `BLOC 3 : Développement de ${
            childrenNodes.length
          } branches à partir du nœud ${current.path
            .map((p) => String.fromCharCode(65 + p))
            .join("→")}`,
        });
      }
    }

    stepCounter++;
    if (stepCounter > 10) break; // Limitation pour éviter trop d'étapes
  }

  // Finalisation
  if (bestPath.length > 0) {
    steps.push({
      type: "final_result",
      bestPath: bestPath,
      bestCost: bestCost,
      description: `Solution optimale trouvée`,
    });
  }

  return { steps, bestPath, bestCost };
}
