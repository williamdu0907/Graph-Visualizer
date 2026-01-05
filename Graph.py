import math
from flask import Flask, jsonify, request
from flask_cors import CORS
from collections import deque

app = Flask(__name__, static_folder="frontend/dist", static_url_path="/")
CORS(app) 

class Graph: # graph = dictionary, keys are vertices composed of integers, values are array of integers
    #signifying that all elements of the array are adjacent to the key

    def __init__(self, dict):
        self.graph_dict = dict

    def getVertices(self):
        return self.graph_dict.keys()
    
    def getAdjacent(self, v):
        if not v in self.getVertices():
            raise Exception("not a vertice")
        return self.graph_dict[v]

    
def dfs(G):
    color, prev = {}, {}
    time = [0]
    order = []

    for v in G.getVertices():
        color[v] = "WHITE"
        prev[v] = None

    def dfs_visit(u):
        time[0] += 1
        color[u] = "GRAY"
        order.append(u)      # ← collect instead of print
        for v in G.getAdjacent(u):
            if color[v] == "WHITE":
                prev[v] = u
                dfs_visit(v)
        color[u] = "BLACK"

    for v in G.getVertices():
        if color[v] == "WHITE":
            dfs_visit(v)

    return {"order": order, "prev": prev}
    



def bfs(G, s):
    color, d, prev = {}, {}, {}
    order = []
    for v in G.getVertices():
        color[v] = "WHITE"
        d[v] = math.inf
        prev[v] = None

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


x = Graph({1:[2], 2:[3, 1], 3:[4,2], 4:[5, 3], 5:[4]})



@app.route("/")
def serve_frontend():
    # Serve the built React app from frontend/dist
    return app.send_static_file("index.html")

@app.route("/hello")
def hello():
    return "Hello, World"

@app.route("/bfs/<int:s>")
def bfs_route(s):
    return jsonify({"order": bfs(x, s)["order"], "graph":x.graph_dict})

@app.route("/dfs")
def dfs_route():
    out = dfs(x)  # must return {"order": [...], ...}
    return jsonify({
        "order": out["order"],
        "graph": x.graph_dict
    })


def parse_graph(adj_json):
    # adj_json like {"1":[2,3], "2":[1], ...}
    adj = {int(k): [int(v) for v in vs] for k, vs in adj_json.items()}
    return Graph(adj)

@app.route("/run", methods=["POST"])
def run_algo():
    data = request.get_json(force=True)

    G = parse_graph(data["graph"]) 
    algo = data.get("algo", "bfs")
    s = int(data.get("start", 1))

    if algo == "bfs":
        if s not in G.getVertices():
            return jsonify({"error": f"start node {s} not in graph"}), 400
        out = bfs(G, s)
    elif algo == "dfs":
        out = dfs(G)
    else:
        return jsonify({"error": "unknown algo"}), 400

    return jsonify({
        "order": out["order"],
        "prev": out.get("prev", {}),
        "graph": G.graph_dict
    })


if __name__ == "__main__":
    app.run(debug=True)


