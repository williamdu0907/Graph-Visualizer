import { useMemo, useState } from "react";

const WIDTH = 700;
const HEIGHT = 450;
const NODE_R = 22;

function gridLayout(nodes) {
  const n = nodes.length;
  if (n === 0) return {};

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  const padX = 50;
  const padY = 50;

  const cellW = (WIDTH - 2 * padX) / Math.max(1, cols - 1);
  const cellH = (HEIGHT - 2 * padY) / Math.max(1, rows - 1);

  const pos = {};
  nodes.forEach((id, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    pos[id] = {
      x: padX + c * cellW,
      y: padY + r * cellH,
    };
  });

  return pos;
}

function edgeListToAdj(text, undirected = true) {
  const adj = {};
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  let invalid = 0;

  for (const line of lines) {
    const [aStr, bStr] = line.split(/\s+/);
    const a = Number(aStr);
    const b = Number(bStr);
    const validA = Number.isInteger(a) && a > 0;
    const validB = Number.isInteger(b) && b > 0;
    if (!validA || !validB) {
      invalid += 1;
      continue;
    }

    if (!adj[a]) adj[a] = [];
    adj[a].push(b);

    if (undirected) {
      if (!adj[b]) adj[b] = [];
      adj[b].push(a);
    }
  }
  return { adj, invalid };
}

function undirectedEdges(adj) {
  const edges = [];
  const seen = new Set();

  for (const [uStr, nbrs] of Object.entries(adj)) {
    const u = Number(uStr);
    for (const v of nbrs) {
      const a = Math.min(u, v);
      const b = Math.max(u, v);
      const key = `${a}-${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

export default function App() {
  const [data, setData] = useState(null);
  const [visited, setVisited] = useState(new Set());
  const [sValue, setSValue] = useState("1");
  const [endValue, setEndValue] = useState("1");
  const [selectedAlgo, setSelectedAlgo] = useState("bfs");
  const [edgeText, setEdgeText] = useState("1 2\n2 3\n3 4\n4 5");
  const [notice, setNotice] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const runUserGraph = async (algo) => {
    setIsRunning(true);
    setNotice("");
    setData(null);
    setVisited(new Set());
    const { adj: graph, invalid } = edgeListToAdj(edgeText, true);
    if (invalid > 0) {
      setNotice("Edges must be positive integers (u v). Please fix the invalid lines.");
      setIsRunning(false);
      return;
    }

    const start = Number(sValue);
    const validStart = Number.isInteger(start) && start > 0;
    if (algo === "bfs" && !validStart) {
      setNotice("Enter a valid positive integer for the start node.");
      setIsRunning(false);
      return;
    }

    const end = Number(endValue);
    const validEnd = Number.isInteger(end) && end > 0;
    if (algo === "shortestpath" && (!validStart || !validEnd)) {
      setNotice("Enter valid positive integers for start and end nodes to find the shortest path.");
      setIsRunning(false);
      return;
    }

    const res = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, start, algo, end }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error(json);
      setNotice(json?.error || "Backend error");
      setIsRunning(false);
      return;
    }

    setData(json);
    setVisited(new Set());
    setIsRunning(false);
    return true;
  };

  const animate = () => {
    if (!data?.order) return;
    setVisited(new Set());
    data.order.forEach((id, i) => {
      setTimeout(() => {
        setVisited((prev) => new Set(prev).add(id));
      }, i * 400);
    });
  };

  // IMPORTANT: include neighbor-only nodes too (prevents pos[v] being undefined)
  const nodes = useMemo(() => {
    if (!data?.graph) return [];
    const s = new Set();
    for (const [uStr, nbrs] of Object.entries(data.graph)) {
      s.add(Number(uStr));
      for (const v of nbrs) s.add(Number(v));
    }
    return [...s].sort((a, b) => a - b);
  }, [data]);

  const pos = useMemo(() => gridLayout(nodes), [nodes]);
  const edges = useMemo(() => (data?.graph ? undirectedEdges(data.graph) : []), [data]);

  return (
    <div className="page">
      <div className="panel">
        <h1>Visualize graph algorithms!</h1>
        <label className="field">
          <span className="field-label">Edges (one per line: "u v")</span>
          <textarea
            rows={6}
            value={edgeText}
            onChange={(e) => setEdgeText(e.target.value)}
            className="edge-input"
          />
        </label>
        {notice && <div className="notice">{notice}</div>}
        <div className="control-grid">
          <label className="field">
            <span className="field-label">Starting point</span>
            <input
              type="number"
              value={sValue}
              onChange={(e) => setSValue(e.target.value)}
              placeholder="Start node"
            />
          </label>
          {selectedAlgo === "shortestpath" && (
            <label className="field">
              <span className="field-label">Endpoint (shortest path)</span>
              <input
                type="number"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
                placeholder="End node"
              />
            </label>
          )}
          <label className="field">
            <span className="field-label">Algorithm</span>
            <select
              value={selectedAlgo}
              onChange={(e) => setSelectedAlgo(e.target.value)}
            >
              <option value="bfs">Breadth-first search</option>
              <option value="dfs">Depth-first search</option>
              <option value="shortestpath">Shortest path (unweighted)</option>
            </select>
          </label>
        </div>
        <div className="action-row">
          <button
            type="button"
            onClick={async () => {
              const ok = await runUserGraph(selectedAlgo);
              if (ok) setTimeout(() => animate(), 0);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : `Run ${selectedAlgo === "shortestpath" ? "shortest path" : selectedAlgo.toUpperCase()}`}
          </button>
        </div>
      </div>

      {data && (
        <div className="panel">
          <div className="result-row">
            Order: {data.order.join(" -> ")}
          </div>

          <svg width={WIDTH} height={HEIGHT} className="graph-area">
            {edges.map(([u, v]) => (
              <line
                key={`${u}-${v}`}
                x1={pos[u]?.x ?? 0}
                y1={pos[u]?.y ?? 0}
                x2={pos[v]?.x ?? 0}
                y2={pos[v]?.y ?? 0}
                stroke="black"
              />
            ))}

            {nodes.map((id) => (
              <g key={id}>
                <circle
                  cx={pos[id]?.x ?? 0}
                  cy={pos[id]?.y ?? 0}
                  r={NODE_R}
                  fill={visited.has(id) ? "lightgreen" : "white"}
                  stroke="black"
                  strokeWidth="2"
                />
                <text
                  x={pos[id]?.x ?? 0}
                  y={(pos[id]?.y ?? 0) + 5}
                  textAnchor="middle"
                  fontSize="14"
                >
                  {id}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
