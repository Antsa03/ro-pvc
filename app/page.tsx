"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INF, solveTSP, Step } from "@/lib/tsp-solver-simple";

export default function TSPPage() {
  const [N, setN] = useState(6);
  const [cities, setCities] = useState(["A", "B", "C", "D", "E", "F"]);
  const [matrixState, setMatrixState] = useState<(number | null)[][]>(
    Array.from({ length: 6 }, () => Array(6).fill(null))
  );
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [bestPath, setBestPath] = useState<number[] | null>(null);
  const [bestCost, setBestCost] = useState<number | null>(null);

  // Fonction utilitaire pour formater les nombres
  const formatNumber = (num: number): string => {
    if (num >= INF) return "∞";
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  // Matrice de l'exemple selon l'image fournie
  const exampleMatrix = [
    [null, 6, 7, 3, 1, 3], // A vers B,C,D,E,F
    [7, null, 8, 2, 9, 7], // B vers A,C,D,E,F
    [5, 10, null, 10, 1, 7], // C vers A,B,D,E,F
    [8, 6, 5, null, 5, 1], // D vers A,B,C,E,F
    [7, 7, 6, 7, null, 4], // E vers A,B,C,D,F
    [9, 8, 8, 5, 3, null], // F vers A,B,C,D,E
  ];

  const handleNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newN = parseInt(e.target.value) || 4;
    setN(newN);
    setCities(
      Array.from({ length: newN }, (_, i) => String.fromCharCode(65 + i))
    );
    setMatrixState(Array.from({ length: newN }, () => Array(newN).fill(null)));
    setSteps([]);
    setBestPath(null);
    setBestCost(null);
    setCurrentStepIndex(0);
  };

  const handleMatrixChange = (i: number, j: number, value: string) => {
    // Empêcher la saisie sur la diagonale
    if (i === j) return;

    const newMatrix = matrixState.map((row) => row.slice());
    const numValue = value === "" ? null : parseFloat(value);

    // Mettre à jour uniquement la cellule modifiée (pas de miroir)
    newMatrix[i][j] = Number.isFinite(numValue as number)
      ? (numValue as number)
      : null;

    setMatrixState(newMatrix);
  };

  const loadExample = () => {
    setN(6);
    setCities(["A", "B", "C", "D", "E", "F"]);
    setMatrixState(exampleMatrix);
    setSteps([]);
    setBestPath(null);
    setBestCost(null);
    setCurrentStepIndex(0);
  };

  const resetAll = () => {
    setSteps([]);
    setBestPath(null);
    setBestCost(null);
    setCurrentStepIndex(0);
    setMatrixState(Array.from({ length: N }, () => Array(N).fill(null)));
  };

  const solve = () => {
    // Vérifier que la matrice est complète
    const isMatrixComplete = matrixState.every((row, i) =>
      row.every((cell, j) => i === j || cell !== null)
    );

    if (!isMatrixComplete) {
      alert(
        "Veuillez remplir toutes les cases de la matrice avant de résoudre."
      );
      return;
    }

    const originalMat = matrixState.map((row, i) =>
      row.map((cell, j) => (i === j ? INF : cell ?? INF))
    );

    try {
      const {
        steps: solverSteps,
        bestPath: path,
        bestCost: cost,
      } = solveTSP(originalMat);
      setSteps(solverSteps);
      setBestPath(path);
      setBestCost(cost);
      setCurrentStepIndex(0);
    } catch (error) {
      console.error("Erreur lors de la résolution:", error);
      alert("Une erreur est survenue lors de la résolution.");
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1)
      setCurrentStepIndex(currentStepIndex + 1);
  };

  const currentStep = steps[currentStepIndex];

  // Rendu de la matrice selon le type d'étape
  const renderMatrixStep = () => {
    if (!currentStep) return null;

    const renderMatrix = (
      matrix: number[][],
      title: string,
      bgColor = "bg-white"
    ) => (
      <div className={`${bgColor} p-3 rounded-lg border`}>
        <h4 className="font-medium text-sm mb-2">{title}</h4>
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 h-8"></TableHead>
                {cities.map((city, j) => (
                  <TableHead key={j} className="w-10 h-8 text-center text-xs">
                    {city}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row, i) => (
                <TableRow key={i} className="h-8">
                  <TableCell className="font-medium text-xs w-8">
                    {cities[i]}
                  </TableCell>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="text-center text-xs w-10 p-1">
                      <span
                        className={cell === 0 ? "text-red-600 font-bold" : ""}
                      >
                        {formatNumber(cell)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );

    switch (currentStep.type) {
      case "matrix_reduction":
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 p-2 rounded text-sm">
              <strong>BLOC 1:</strong> {currentStep.description}
            </div>
            <div className="grid gap-3">
              {renderMatrix(
                currentStep.originalMatrix,
                "Matrice originale",
                "bg-gray-50"
              )}
              {renderMatrix(
                currentStep.reducedMatrix,
                `Matrice réduite (réduction = ${currentStep.reductionValue})`,
                "bg-green-50"
              )}
            </div>
          </div>
        );

      case "regret_calculation":
        return (
          <div className="space-y-3">
            <div className="bg-yellow-50 p-2 rounded text-sm">
              <strong>BLOC 2:</strong> {currentStep.description}
            </div>
            {renderMatrix(
              currentStep.matrix,
              "Matrice avec regrets calculés",
              "bg-yellow-50"
            )}
            <div className="bg-yellow-100 p-2 rounded text-xs">
              <p>
                <strong>Regret maximum:</strong> (
                {cities[currentStep.maxRegret.i]},{" "}
                {cities[currentStep.maxRegret.j]}) ={" "}
                {currentStep.maxRegret.regret}
              </p>
            </div>
          </div>
        );

      case "branch_development":
        return (
          <div className="space-y-3">
            <div className="bg-purple-50 p-2 rounded text-sm">
              <strong>BLOC 3:</strong> Développement de l'arborescence
            </div>
            <div className="bg-yellow-100 p-2 rounded text-xs">
              <p>
                Arc sélectionné: ({cities[currentStep.selectedArc.i]},{" "}
                {cities[currentStep.selectedArc.j]}) avec ρ ={" "}
                {currentStep.maxRegret.regret}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {renderMatrix(
                currentStep.type1Node.matrix,
                `Type 1: b₁ = ${currentStep.type1Node.lowerBound}`,
                "bg-green-50"
              )}
              {renderMatrix(
                currentStep.type2Node.matrix,
                `Type 2: b₂ = ${currentStep.type2Node.lowerBound}`,
                "bg-orange-50"
              )}
            </div>
          </div>
        );

      case "arc_blocking":
        return (
          <div className="space-y-3">
            <div className="bg-orange-50 p-2 rounded text-sm">
              <strong>BLOC 4:</strong> {currentStep.description}
            </div>
            <div className="grid gap-3">
              {renderMatrix(
                currentStep.originalMatrix,
                "Matrice avant blocage",
                "bg-gray-50"
              )}
              {renderMatrix(
                currentStep.blockedMatrix,
                "Matrice après blocage de l'arc",
                "bg-orange-50"
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm">{currentStep.description}</p>
          </div>
        );
    }
  };

  // Rendu du graphe selon le style de l'image fournie
  const renderGraphVisualization = () => {
    // Positions optimisées pour un affichage plus équilibré
    const nodePositions: { [key: string]: { x: number; y: number } } = {
      A: { x: 120, y: 200 }, // Nœud de gauche
      B: { x: 280, y: 120 }, // Nœud en haut centre
      C: { x: 440, y: 180 }, // Nœud à droite
      D: { x: 380, y: 300 }, // Nœud en bas à droite
      E: { x: 240, y: 340 }, // Nœud en bas centre
      F: { x: 100, y: 300 }, // Nœud en bas à gauche
    };

    // Styles minimalistes
    const EDGE_COLOR = "#4b5563"; // gray-600
    const EDGE_HALO_W = 3.5; // halo plus fin
    const EDGE_W = 2; // trait d'arête
    const LABEL_FONT = "text-[11px] font-medium fill-gray-900";
    const LABEL_BORDER = "#4b5563";
    const NODE_STROKE = "#9ca3af"; // gray-400
    const NODE_STROKE_ACTIVE = "#111827"; // gray-900
    const NODE_R_DRAW = 16; // rayon visible du nœud
    const ARROW_CLEARANCE = 3; // petit recul pour éviter que la pointe touche le nœud

    // Helpers pour courbes et labels
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));
    const quadAt = (t: number, p0: number, p1: number, p2: number) =>
      (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    const quadTangent = (t: number, p0: number, p1: number, p2: number) =>
      2 * ((1 - t) * (p1 - p0) + t * (p2 - p1));

    function computeCurvedPath(
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      altSign = 1
    ) {
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      // Offsets calibrés: départ au bord du nœud, arrivée reculée pour la flèche
      const startOffset = NODE_R_DRAW + 2; // rayon + trait
      const endOffset = NODE_R_DRAW + 2 + ARROW_CLEARANCE;

      const startX = p0.x + ux * startOffset;
      const startY = p0.y + uy * startOffset;
      const endX = p1.x - ux * endOffset;
      const endY = p1.y - uy * endOffset;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const nx = -uy;
      const ny = ux;

      // Courbure douce
      const amplitude = altSign * clamp(dist * 0.12, 10, 28);
      const cx = midX + nx * amplitude;
      const cy = midY + ny * amplitude;

      return {
        d: `M ${startX},${startY} Q ${cx},${cy} ${endX},${endY}`,
        startX,
        startY,
        cx,
        cy,
        endX,
        endY,
      };
    }

    // Pré-calcul des arêtes et labels (labels seront rendus après les nœuds pour rester au premier plan)
    const edges = (bestPath ?? [])
      .map((cityIndex, i) => {
        const fromIndex = cityIndex;
        const toIndex = (bestPath as number[])[
          (i + 1) % (bestPath as number[]).length
        ];
        const fromCity = cities[fromIndex];
        const toCity = cities[toIndex];
        const p0 = nodePositions[fromCity];
        const p1 = nodePositions[toCity];
        if (!p0 || !p1) return null;

        const altSign = i % 2 === 0 ? 1 : -1;
        const { d, startX, startY, cx, cy, endX, endY } = computeCurvedPath(
          p0,
          p1,
          altSign
        );

        // Label près du début de l'arête
        const tNear = 0.12;
        const px = quadAt(tNear, startX, cx, endX);
        const py = quadAt(tNear, startY, cy, endY);
        const tx = quadTangent(tNear, startX, cx, endX);
        const ty = quadTangent(tNear, startY, cy, endY);
        const tLen = Math.hypot(tx, ty) || 1;
        const nx = -ty / tLen;
        const ny = tx / tLen;
        const offset = 8 * altSign;
        const labelX = px + nx * offset;
        const labelY = py + ny * offset;

        const cost = matrixState[fromIndex]?.[toIndex] ?? 0;
        const costStr = String(cost);
        const labelW = Math.max(22, costStr.length * 8);
        const labelH = 16;

        return {
          key: `optimal-${fromIndex}-${toIndex}`,
          d,
          labelX,
          labelY,
          costStr,
          labelW,
          labelH,
        };
      })
      .filter(Boolean) as {
      key: string;
      d: string;
      labelX: number;
      labelY: number;
      costStr: string;
      labelW: number;
      labelH: number;
    }[];

    return (
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Graphe TSP
          </h3>
          {bestPath && bestCost && (
            <div className="inline-block bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-green-800">
                Solution: <span className="font-bold">{bestCost}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <svg
            width="560"
            height="400"
            viewBox="0 0 560 400"
            className="bg-white"
          >
            <defs>
              {/* Flèche sombre minimaliste (pointe plus petite) */}
              <marker
                id="arrowDark"
                markerWidth="6"
                markerHeight="5"
                refX="5"
                refY="2.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0,0 6,2.5 0,5" fill="#111827" />
              </marker>

              {/* Ombre légère pour les nœuds (conservée) */}
              <filter
                id="nodeShadow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feDropShadow
                  dx="1"
                  dy="1"
                  stdDeviation="1"
                  floodColor="#000"
                  floodOpacity="0.2"
                />
              </filter>
            </defs>

            {/* Arcs (halo + ligne) */}
            {bestPath && (
              <g>
                {edges.map((e) => (
                  <g key={e.key}>
                    <path
                      d={e.d}
                      fill="none"
                      stroke="white"
                      strokeWidth={EDGE_HALO_W}
                      strokeLinecap="round"
                    />
                    <path
                      d={e.d}
                      fill="none"
                      stroke={EDGE_COLOR}
                      strokeWidth={EDGE_W}
                      strokeLinecap="round"
                      markerEnd="url(#arrowDark)"
                    />
                  </g>
                ))}
              </g>
            )}

            {/* Nœuds */}
            <g>
              {cities.map((city, index) => {
                const pos = nodePositions[city];
                if (!pos) return null;
                const isInPath = bestPath?.includes(index);
                return (
                  <g key={city}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NODE_R_DRAW}
                      fill="white"
                      stroke={isInPath ? NODE_STROKE_ACTIVE : NODE_STROKE}
                      strokeWidth={isInPath ? 2.5 : 1.5}
                      filter="url(#nodeShadow)"
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 5}
                      textAnchor="middle"
                      className={`text-lg font-semibold ${
                        isInPath ? "fill-gray-900" : "fill-gray-700"
                      }`}
                    >
                      {city}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Labels au premier plan (après les nœuds) */}
            {bestPath && (
              <g>
                {edges.map((e) => (
                  <g
                    key={`label-${e.key}`}
                    transform={`translate(${e.labelX}, ${e.labelY})`}
                  >
                    <rect
                      x={-e.labelW / 2}
                      y={-e.labelH / 2}
                      width={e.labelW}
                      height={e.labelH}
                      rx="4"
                      fill="white"
                      stroke={LABEL_BORDER}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={LABEL_FONT}
                    >
                      {e.costStr}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Informations minimales du chemin */}
            {bestPath && bestCost && (
              <g transform="translate(20, 20)">
                <rect
                  x="0"
                  y="0"
                  width="160"
                  height="60"
                  rx="6"
                  fill="rgba(255,255,255,0.95)"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="10"
                  y="18"
                  className="text-sm font-semibold fill-green-800"
                >
                  Solution optimale
                </text>

                <text x="10" y="35" className="text-xs fill-gray-600">
                  {bestPath.map((i) => cities[i]).join(" → ")} →{" "}
                  {cities[bestPath[0]]}
                </text>

                <text
                  x="10"
                  y="50"
                  className="text-sm font-bold fill-green-600"
                >
                  Coût: {bestCost}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Résumé minimaliste */}
        {bestPath && bestCost && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 border">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">
                  Chemin solution
                </h4>
                <div className="text-sm">
                  {bestPath.map((cityIndex, i) => (
                    <span key={i} className="inline-flex items-center mr-1">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        {cities[cityIndex]}
                      </span>
                      {i < bestPath.length - 1 && (
                        <span className="mx-1 text-gray-400">→</span>
                      )}
                    </span>
                  ))}
                  <span className="mx-1 text-gray-400">→</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    {cities[bestPath[0]]}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">
                  Coût optimal
                </h4>
                <div className="text-2xl font-bold text-green-600">
                  {bestCost}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Rendu de l'arbre de décision simplifié et centré (dynamique)
  const renderDecisionTree = () => {
    // Extraire les étapes utiles
    const startStep = steps.find((s) => s.type === "start") as any;
    const bdSteps = steps.filter(
      (s) => s.type === "branch_development"
    ) as any[];

    const rootValue = startStep?.node?.lowerBound ?? null;

    // Layout
    const svgW = 900;
    const svgH = Math.max(380, 140 + bdSteps.length * 110);
    const centerX = svgW / 2;
    const rootY = 60;
    const levelGapY = 110;
    const pairOffsetX = 110; // demi-écart entre include/exclude

    // Helpers libellés
    const arcLabel = (i: number, j: number) => `${cities[i]}${cities[j]}`;
    const arcLabelExcluded = (i: number, j: number) =>
      `${cities[i]}${cities[j]}̄`;

    if (bdSteps.length === 0) {
      return (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-3">🌲</div>
            <div className="text-lg font-medium mb-1">Arbre de décision</div>
            <div className="text-sm">
              L'arbre sera généré après la résolution du TSP
            </div>
          </div>
        </div>
      );
    }

    // Préparer les niveaux (positions et sélection)
    type NodeVis = {
      x: number;
      y: number;
      label: string;
      bound: number;
      selected: boolean;
      kind: "include" | "exclude";
    };
    const levels: { include: NodeVis; exclude: NodeVis }[] = [];

    // Le nœud sélectionné précédent (pour relier)
    let prevSelectedX = centerX;
    let prevSelectedY = rootY;

    bdSteps.forEach((step, idx) => {
      const y = rootY + (idx + 1) * levelGapY;
      const includeBound = step.type1Node.lowerBound as number;
      const excludeBound = step.type2Node.lowerBound as number;
      const selectExclude = excludeBound <= includeBound; // sélection = borne minimale
      const i = step.selectedArc.i as number;
      const j = step.selectedArc.j as number;

      const include: NodeVis = {
        x: centerX - pairOffsetX,
        y,
        label: arcLabel(i, j),
        bound: includeBound,
        selected: !selectExclude,
        kind: "include",
      };
      const exclude: NodeVis = {
        x: centerX + pairOffsetX,
        y,
        label: arcLabelExcluded(i, j),
        bound: excludeBound,
        selected: selectExclude,
        kind: "exclude",
      };

      levels.push({ include, exclude });

      // Mettre à jour le point sélectionné pour relier au niveau suivant
      const sel = selectExclude ? exclude : include;
      prevSelectedX = sel.x;
      prevSelectedY = sel.y;
    });

    return (
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Arbre de Décision
          </h3>
          <div className="inline-block bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-800">
              Algorithme de Little (Branch & Bound)
            </span>
          </div>
        </div>

        <div className="flex justify-center overflow-x-auto">
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="bg-white"
          >
            <defs>
              {/* Ombres */}
              <filter
                id="treeShadow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feDropShadow
                  dx="1"
                  dy="1"
                  stdDeviation="1"
                  floodColor="#000"
                  floodOpacity="0.2"
                />
              </filter>
              {/* Flèche pour les connexions */}
              <marker
                id="treeArrow"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon points="0,0 6,2 0,4" fill="#6b7280" />
              </marker>
              {/* Flèche sélectionnée */}
              <marker
                id="treeArrowSel"
                markerWidth="7"
                markerHeight="5"
                refX="5.5"
                refY="2.5"
                orient="auto"
              >
                <polygon points="0,0 7,2.5 0,5" fill="#16a34a" />
              </marker>
              {/* Gradients des nœuds */}
              <radialGradient id="rootGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
              <radialGradient id="includeGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </radialGradient>
              <radialGradient id="excludeGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#4b5563" />
              </radialGradient>
            </defs>

            {/* Nœud racine */}
            <g>
              <circle
                cx={centerX}
                cy={rootY}
                r="20"
                fill="url(#rootGradient)"
                stroke="#1e40af"
                strokeWidth="2"
                filter="url(#treeShadow)"
              />
              <text
                x={centerX}
                y={rootY + 6}
                textAnchor="middle"
                className="text-sm font-bold fill-white"
              >
                R
              </text>
              {rootValue !== null && (
                <text
                  x={centerX}
                  y={rootY + 28}
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-700"
                >
                  {rootValue}
                </text>
              )}
            </g>

            {/* Connexions et nœuds par niveau */}
            {levels.map((lvl, idx) => {
              const fromX =
                idx === 0
                  ? centerX
                  : levels[idx - 1][
                      levels[idx - 1].include.selected ? "include" : "exclude"
                    ].x;
              const fromY =
                idx === 0
                  ? rootY
                  : levels[idx - 1][
                      levels[idx - 1].include.selected ? "include" : "exclude"
                    ].y;

              // Lignes vers include/exclude (gris) + ligne sélectionnée (verte)
              const lines = [
                {
                  to: lvl.include,
                  stroke: "#6b7280",
                  marker: "url(#treeArrow)",
                  width: 1.5,
                },
                {
                  to: lvl.exclude,
                  stroke: "#6b7280",
                  marker: "url(#treeArrow)",
                  width: 1.5,
                },
              ];

              const sel = lvl.include.selected ? lvl.include : lvl.exclude;

              return (
                <g key={`lvl-${idx}`}>
                  {lines.map((ln, k) => (
                    <line
                      key={k}
                      x1={fromX}
                      y1={fromY + 20}
                      x2={ln.to.x}
                      y2={ln.to.y - 20}
                      stroke={ln.stroke}
                      strokeWidth={ln.width}
                      markerEnd={ln.marker}
                    />
                  ))}
                  {/* surligner la sélection */}
                  <line
                    x1={fromX}
                    y1={fromY + 20}
                    x2={sel.x}
                    y2={sel.y - 20}
                    stroke="#16a34a"
                    strokeWidth={3}
                    markerEnd="url(#treeArrowSel)"
                  />

                  {/* Nœud include */}
                  <g>
                    <circle
                      cx={lvl.include.x}
                      cy={lvl.include.y}
                      r="18"
                      fill="url(#includeGradient)"
                      stroke={lvl.include.selected ? "#16a34a" : "#dc2626"}
                      strokeWidth={lvl.include.selected ? 3 : 2}
                      filter="url(#treeShadow)"
                    />
                    <text
                      x={lvl.include.x}
                      y={lvl.include.y + 4}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white"
                    >
                      {lvl.include.label}
                    </text>
                    <text
                      x={lvl.include.x}
                      y={lvl.include.y + 24}
                      textAnchor="middle"
                      className="text-xs font-bold fill-gray-700"
                    >
                      {lvl.include.bound}
                    </text>
                  </g>

                  {/* Nœud exclude */}
                  <g>
                    <circle
                      cx={lvl.exclude.x}
                      cy={lvl.exclude.y}
                      r="18"
                      fill="url(#excludeGradient)"
                      stroke={lvl.exclude.selected ? "#16a34a" : "#4b5563"}
                      strokeWidth={lvl.exclude.selected ? 3 : 2}
                      filter="url(#treeShadow)"
                    />
                    <text
                      x={lvl.exclude.x}
                      y={lvl.exclude.y + 4}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white"
                    >
                      {lvl.exclude.label}
                    </text>
                    <text
                      x={lvl.exclude.x}
                      y={lvl.exclude.y + 24}
                      textAnchor="middle"
                      className="text-xs font-bold fill-gray-700"
                    >
                      {lvl.exclude.bound}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Résultat (si disponible) */}
            {bestPath && bestCost && (
              <g transform={`translate(${svgW - 220}, 20)`}>
                <rect
                  x="0"
                  y="0"
                  width="200"
                  height="70"
                  rx="6"
                  fill="rgba(34,197,94,0.1)"
                  stroke="#22c55e"
                  strokeWidth="1"
                />
                <text
                  x="100"
                  y="16"
                  textAnchor="middle"
                  className="text-sm font-semibold fill-green-800"
                >
                  Résultat
                </text>
                <text x="10" y="35" className="text-xs fill-gray-700">
                  Coût optimal:
                </text>
                <text
                  x="120"
                  y="35"
                  className="text-xs font-bold fill-green-600"
                >
                  {bestCost}
                </text>
                <text x="10" y="52" className="text-xs fill-gray-700">
                  Chemin:
                </text>
                <text x="10" y="66" className="text-xs font-bold fill-gray-800">
                  {bestPath.map((i) => cities[i]).join("→")}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Résolveur TSP avec l'Algorithme de Little
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Entrez le nombre de villes et leurs noms</li>
              <li>Remplissez la matrice des distances</li>
              <li>
                Cliquez sur "Résoudre" pour voir la solution étape par étape
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Layout principal : deux colonnes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Colonne gauche : Matrices et contrôles */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Nombre de villes :
                    </label>
                    <Input
                      type="number"
                      value={N}
                      onChange={handleNChange}
                      className="w-full"
                      min="2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Noms des villes :
                    </label>
                    <Input
                      type="text"
                      value={cities.join(",")}
                      onChange={(e) =>
                        setCities(
                          e.target.value.split(",").map((s) => s.trim())
                        )
                      }
                      placeholder="A,B,C,D,E,F"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={loadExample} variant="outline" size="sm">
                    Charger l'exemple
                  </Button>
                  <Button
                    onClick={solve}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Résoudre
                  </Button>
                  <Button
                    onClick={resetAll}
                    variant="outline"
                    className="text-red-600"
                    size="sm"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matrice des distances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">De\À</TableHead>
                        {cities.map((city, i) => (
                          <TableHead key={i} className="text-center w-16">
                            {city}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixState.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {cities[i]}
                          </TableCell>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="p-1">
                              {i === j ? (
                                // Case diagonale grise, non interactive
                                <div
                                  className="w-14 h-8 rounded bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center select-none"
                                  aria-label="Infini"
                                  title="Infini"
                                >
                                  ∞
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  value={cell ?? ""}
                                  onChange={(e) =>
                                    handleMatrixChange(i, j, e.target.value)
                                  }
                                  className="w-14 h-8 text-center text-xs p-1"
                                  placeholder="0"
                                />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Affichage des matrices de chaque étape */}
            {steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Matrices - Étape par étape</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button
                      onClick={prevStep}
                      disabled={currentStepIndex === 0}
                      size="sm"
                    >
                      Précédent
                    </Button>
                    <Button
                      onClick={nextStep}
                      disabled={currentStepIndex >= steps.length - 1}
                      size="sm"
                    >
                      Suivant
                    </Button>
                    <span className="ml-2 text-sm text-gray-600 self-center">
                      Étape {currentStepIndex + 1} sur {steps.length}
                    </span>
                  </div>

                  {/* Affichage de la matrice selon le type d'étape */}
                  {renderMatrixStep()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne droite : Graphes et arbre de décision */}
          <div className="space-y-4">
            {steps.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Visualisation du graphe</CardTitle>
                  </CardHeader>
                  <CardContent>{renderGraphVisualization()}</CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Arbre de décision</CardTitle>
                  </CardHeader>
                  <CardContent>{renderDecisionTree()}</CardContent>
                </Card>
              </>
            )}

            {bestPath && bestCost && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Solution trouvée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="font-medium text-green-800 mb-2">
                        Meilleur chemin :{" "}
                        {bestPath.map((i) => cities[i]).join(" → ")}
                      </p>
                      <p className="font-medium text-green-800">
                        Coût total : {bestCost}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Message BLOC 4 selon les images */}
                <Card>
                  <CardContent className="p-4">
                    <div className="bg-yellow-400 p-4 rounded-lg border-2 border-yellow-500">
                      <p className="font-bold text-black text-sm">
                        <strong>BLOC 4 :</strong> Bloquer l'arc (x, y) de la
                        matrice des coûts réduits.
                      </p>
                      <p className="font-bold text-black text-sm mt-1">
                        Puis soustraire le plus petit élément de la ligne x et
                        de la colonne y. Revenir au <strong>BLOC 2</strong>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
