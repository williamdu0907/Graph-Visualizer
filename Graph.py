import math
from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import deque

app = Flask(__name__, static_folder="frontend/dist", static_url_path="/")
CORS(app) 

class Graph:
    def __init__(self, dict):
        self.graph_dict = dict

    def getVertices(self):
        return self.graph_dict.keys()
    
    def getAdjacent(self, v):
        if not v in self.getVertices():
            raise Exception("not a vertice")
        return self.graph_dict[v]
    
# convert n by m grid into a dict
def grid_to_adj(n, m):
    adj = {}
    for i in range(n):
        for j in range(m):
            key = f"{i},{j}"
            adj[key] = []
            for di, dj in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                ni, nj = i + di, j + dj
                if 0 <= ni < n and 0 <= nj < m:
                    adj[key].append(f"{ni},{nj}")
    return adj



    
def dfs(G, blocked=None):
    blocked = set(blocked or [])
    color, prev = {}, {}
    time = [0]
    order = []

    for v in G.getVertices():
        color[v] = "BLACK" if v in blocked else "WHITE"
        prev[v] = None 

    def dfs_visit(u):
        time[0] += 1
        color[u] = "GRAY"
        order.append(u)
        for v in G.getAdjacent(u):
            if color[v] == "WHITE":
                prev[v] = u
                dfs_visit(v)
        color[u] = "BLACK"

    for v in G.getVertices():
        if color[v] == "WHITE":
            dfs_visit(v)

    return {"order": order, "prev": prev}
    



def bfs(G, s, blocked=None):
    blocked = set(blocked or [])
    color, d, prev = {}, {}, {}
    order = []
    for v in G.getVertices():
        color[v] = "BLACK" if v in blocked else "WHITE"
        d[v] = math.inf
        prev[v] = None

    if s not in color or color[s] == "BLACK":
        return {"order": [], "prev": prev, "distance": "NO PATH"}

    color[s] = "GRAY"
    count = 0
    d[s] = 0
    prev[s] = None
    queue = deque()
    queue.append(s)
    while queue:
        u = queue.popleft()
        count += 1
        order.append(u)
        for v in G.getAdjacent(u):
            if color[v] == "WHITE":
                color[v] = "GRAY"
                d[v] = d[u] + 1
                prev[v] = u
                queue.append(v)
        color[u] = "BLACK"
    return {"order":order, "prev":prev}

#shortestPath from s to b, assuming a and b are vertices of G, blocked is a collection of nodes "i,j" that are blocked
def shortestPath(G, s, b, blocked=None):
    blocked = set(blocked or [])
    color, d, prev = {}, {}, {}
    order = []
    for v in G.getVertices():
        if v in blocked:
            color[v] = "BLACK"
        else:
            color[v] = "WHITE"
        d[v] = math.inf
        prev[v] = None
    if s not in color or b not in color:
        return {"distance": "NO PATH", "order": order, "prev": prev}
    if color[s] == "BLACK" or color[b] == "BLACK":
        return {"distance": "NO PATH", "order":order, "prev":prev}
    color[s] = "GRAY"
    d[s] = 0
    prev[s] = None
    queue = deque()
    queue.append(s) 
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in G.getAdjacent(u):
            if color[v] == "WHITE":
                color[v] = "GRAY"
                d[v] = d[u] + 1
                prev[v] = u
                queue.append(v)
        color[u] = "BLACK"
        if u == b:
            path = []
            curr = u
            seen = set()
            max_steps = len(prev) + 1  # guard against bad predecessor cycles
            steps = 0
            while curr is not None:
                if curr in seen or steps > max_steps:
                    raise ValueError("Invalid predecessor chain detected while building path.")
                seen.add(curr)
                path.append(curr)
                curr = prev[curr]
                steps += 1
            path.reverse()
            return {"distance": d[u], "order":path, "prev":prev}
    return {"distance": "NO PATH", "order":order, "prev":prev}



x = Graph(grid_to_adj(3, 3))



@app.route("/")
def serve_frontend():
    # Serve the built React app from frontend/dist
    return app.send_static_file("index.html")

@app.route("/hello")
def hello():
    return "Hello, World"

@app.route("/bfs/<string:s>")
def bfs_route(s):
    return jsonify({"order": bfs(x, s)["order"], "graph":x.graph_dict})

@app.route("/dfs")
def dfs_route():
    out = dfs(x)  # must return {"order": [...], ...}
    return jsonify({
        "order": out["order"],
        "graph": x.graph_dict
    })

@app.route("/shortestpath/<string:s>/<string:b>")
def shortestpath_route(s, b):
    out = shortestPath(x, s, b, [])
    return jsonify({"order": out["order"], "distance": out["distance"], "graph":x.graph_dict})

def parse_graph(adj_json):
    return Graph(adj_json)


@app.route("/run", methods=["POST"])
def run_algo():
    data = request.get_json(force=True)

    G = parse_graph(data["graph"]) 
    algo = data.get("algo", "bfs")
    s = data.get("start", "0,0")
    b = data.get("end", "0,0")
    if algo == "bfs":
        if s not in G.getVertices():
            return jsonify({"error": f"start node {s} not in graph"}), 400
        out = bfs(G, s, data.get("blocked", []))
    elif algo == "dfs":
        out = dfs(G, data.get("blocked", []))
    elif algo == "shortestpath":
        if s not in G.getVertices() or b not in G.getVertices():
            return jsonify({"error": f"Endpoints are not vertices of the graph"}), 400
        try:
            out = shortestPath(G, s, b, data.get("blocked", []))
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
    else:
        return jsonify({"error": "unknown algo"}), 400

    return jsonify({
        "order": out["order"],
        "prev": out.get("prev", {}),
        "distance": out.get("distance"),
        "graph": G.graph_dict
    })


if __name__ == "__main__":
    app.run(debug=True)


