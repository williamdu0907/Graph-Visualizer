import { useEffect, useMemo, useRef, useState } from "react";

const WIDTH = 700;
const HEIGHT = 450;
const NODE_R = 22;
const NODE_ID_RE = /^\d+,\d+$/;

function gridLayout(n, m) {
  if (n <= 0 || m <= 0) return {};

  const padX = 50;
  const padY = 50;
  const cellW = (WIDTH - 2 * padX) / Math.max(1, m - 1);
  const cellH = (HEIGHT - 2 * padY) / Math.max(1, n - 1);

  const pos = {};
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const id = `${i},${j}`;
      pos[id] = {
        x: padX + j * cellW,
        y: padY + i * cellH,
      };
    }
  }
  return pos;
}

function parseNodeId(token) {
  if (!NODE_ID_RE.test(token)) return null;
  const [iStr, jStr] = token.split(",");
  return { i: Number(iStr), j: Number(jStr) };
}

function gridToAdj(n, m, undirected = true) {
  const adj = {};
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const id = `${i},${j}`;
      adj[id] = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || ni >= n || nj < 0 || nj >= m) continue;
        const nid = `${ni},${nj}`;
        adj[id].push(nid);
        if (undirected) {
          if (!adj[nid]) adj[nid] = [];
          adj[nid].push(id);
        }
      }
    }
  }
  return adj;
}

function undirectedEdges(adj) {
  const edges = [];
  const seen = new Set();

  for (const [uStr, nbrs] of Object.entries(adj)) {
    for (const v of nbrs) {
      const a = uStr < v ? uStr : v;
      const b = uStr < v ? v : uStr;
      const key = `${a}|${b}`;
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
  const [sValue, setSValue] = useState("0,0");
  const [endValue, setEndValue] = useState("0,0");
  const [nValue, setNValue] = useState("3");
  const [mValue, setMValue] = useState("3");
  const [selectedAlgo, setSelectedAlgo] = useState("bfs");
  const [notice, setNotice] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const timeoutsRef = useRef([]);

  const clearAnimation = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    const n = Number(nValue);
    const m = Number(mValue);
    clearAnimation();
    setVisited(new Set());
    if (Number.isInteger(n) && n >= 1 && Number.isInteger(m) && m >= 1) {
      setSValue("0,0");
      setEndValue(`${n - 1},${m - 1}`);
    } else {
      setSValue("0,0");
      setEndValue("0,0");
    }
  }, [nValue, mValue]);

  const runUserGraph = async (algo) => {
    clearAnimation();
    setIsRunning(true);
    setNotice("");
    setData(null);
    setVisited(new Set());
    const n = Number(nValue);
    const m = Number(mValue);
    const validN = Number.isInteger(n) && n >= 1;
    const validM = Number.isInteger(m) && m >= 1;
    if (!validN || !validM) {
      setNotice("Enter valid integers n, m >= 1.");
      setIsRunning(false);
      return;
    }
    const graph = gridToAdj(n, m, true);

    const start = sValue.trim();
    const startPos = parseNodeId(start);
    const validStart = !!startPos && startPos.i >= 0 && startPos.i < n && startPos.j >= 0 && startPos.j < m;
    if (algo === "bfs" && !validStart) {
      setNotice('Enter a start node like "0,0" that is inside the grid.');
      setIsRunning(false);
      return;
    }

    const end = endValue.trim();
    const endPos = parseNodeId(end);
    const validEnd = !!endPos && endPos.i >= 0 && endPos.i < n && endPos.j >= 0 && endPos.j < m;
    if (algo === "shortestpath" && (!validStart || !validEnd)) {
      setNotice('Enter start/end nodes like "0,0" that are inside the grid.');
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
    clearAnimation();
    setVisited(new Set());
    data.order.forEach((id, i) => {
      const timeoutId = setTimeout(() => {
        setVisited((prev) => new Set(prev).add(id));
      }, i * 200);
      timeoutsRef.current.push(timeoutId);
    });
  };

  // IMPORTANT: include neighbor-only nodes too (prevents pos[v] being undefined)
  const nodes = useMemo(() => {
    if (!data?.graph) return [];
    const s = new Set();
    for (const [uStr, nbrs] of Object.entries(data.graph)) {
      s.add(uStr);
      for (const v of nbrs) s.add(v);
    }
    return [...s].sort((a, b) => {
      const aPos = parseNodeId(a);
      const bPos = parseNodeId(b);
      if (!aPos || !bPos) return a.localeCompare(b);
      if (aPos.i !== bPos.i) return aPos.i - bPos.i;
      return aPos.j - bPos.j;
    });
  }, [data]);

  const gridSize = useMemo(() => {
    let maxI = -1;
    let maxJ = -1;
    for (const id of nodes) {
      const pos = parseNodeId(id);
      if (!pos) continue;
      maxI = Math.max(maxI, pos.i);
      maxJ = Math.max(maxJ, pos.j);
    }
    return { n: maxI + 1, m: maxJ + 1 };
  }, [nodes]);

  const pos = useMemo(() => gridLayout(gridSize.n, gridSize.m), [gridSize]);
  const edges = useMemo(() => (data?.graph ? undirectedEdges(data.graph) : []), [data]);

  return (
    <div className="page">
      <div className="panel">
        <h1>Visualize graph algorithms!</h1>
        <div className="control-grid">
          <label className="field">
            <span className="field-label">Rows (n)</span>
            <input
              type="number"
              min="1"
              value={nValue}
              onChange={(e) => setNValue(e.target.value)}
              placeholder="n"
            />
          </label>
          <label className="field">
            <span className="field-label">Columns (m)</span>
            <input
              type="number"
              min="1"
              value={mValue}
              onChange={(e) => setMValue(e.target.value)}
              placeholder="m"
            />
          </label>
        </div>
        {notice && <div className="notice">{notice}</div>}
        <div className="control-grid">
          <label className="field">
            <span className="field-label">Starting point</span>
            <input
              type="text"
              value={sValue}
              onChange={(e) => setSValue(e.target.value)}
              placeholder="0,0"
            />
          </label>
          {selectedAlgo === "shortestpath" && (
            <label className="field">
              <span className="field-label">Endpoint (shortest path)</span>
              <input
                type="text"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
                placeholder="0,0"
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
