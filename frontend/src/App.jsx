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

  for (const line of lines) {
    const [aStr, bStr] = line.split(/\s+/);
    const a = Number(aStr), b = Number(bStr);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

    if (!adj[a]) adj[a] = [];
    adj[a].push(b);

    if (undirected) {
      if (!adj[b]) adj[b] = [];
      adj[b].push(a);
    }
  }
  return adj;
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
  const [edgeText, setEdgeText] = useState("1 2\n2 3\n3 4\n4 5");

  const runUserGraph = async (algo) => {
    const graph = edgeListToAdj(edgeText, true);

    const start = Number(sValue);
    if (algo === "bfs" && !Number.isFinite(start)) {
      alert("Enter a valid start node for BFS.");
      return;
    }

    const res = await fetch("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph, start, algo }),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error(json);
      alert(json?.error || "Backend error");
      return;
    }

    setData(json);
    setVisited(new Set());
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
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <div>Edges (one per line: "u v"):</div>
        <textarea
          rows={6}
          cols={30}
          value={edgeText}
          onChange={(e) => setEdgeText(e.target.value)}
          style={{ display: "block", marginTop: 6 }}
        />
      </div>

      <input
        type="number"
        value={sValue}
        onChange={(e) => setSValue(e.target.value)}
        placeholder="Start node (s)"
      />

      <button type="button" onClick={() => runUserGraph("bfs")}>
        Run BFS (user graph)
      </button>
      <button type="button" onClick={() => runUserGraph("dfs")}>
        Run DFS (user graph)
      </button>

      <button type="button" onClick={animate} disabled={!data}>
        Animate
      </button>

      {data && (
        <>
          <div style={{ margin: "8px 0" }}>
            Order: {data.order.join(" → ")}
          </div>

          <svg width={WIDTH} height={HEIGHT} style={{ border: "1px solid #ccc" }}>
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
        </>
      )}
    </div>
  );
}
