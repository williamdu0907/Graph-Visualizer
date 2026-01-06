# Graph Visualizer

Interactive Flask + React app to enter a graph (edge list) and see how classic algorithms traverse it. Supports:
- Breadth-first search (BFS)
- Depth-first search (DFS)
- Unweighted shortest path (BFS-based) between two nodes

Features:
- A Graph is considered as a collection of edges u v, where u, v are positive integers that need not be distinct. 
- Choose algorithm from a dropdown; shortest-path prompts for both endpoints
- Run and animate the traversal order on an SVG layout

## Prerequisites
- Python 3.x
- Node.js and npm

## Setup
1) Clone the repo:
```bash
git clone <repo-url>
cd Graph\ Visualizer
```
2) Install frontend deps:
```bash
cd frontend
npm install
```
3) Install backend deps:
```bash
cd ..
pip install -r requirements.txt
```

## Build the frontend
From `frontend/`:
```bash
npm run build
```
This writes static assets to `frontend/dist`, which Flask serves.

## Run the app (Flask serving built frontend)
```bash
python Graph.py
```
Then open http://127.0.0.1:5000.

## Develop with hot reload
Run these in parallel:
```bash
# terminal 1 (frontend)
cd frontend
npm run dev   # typically http://localhost:5173

# terminal 2 (backend)
cd ..
python Graph.py
```
The Vite dev server proxies API calls to Flask.

## Notes
- `.gitignore` excludes build artifacts and caches (node_modules, dist, __pycache__, etc.).
- After frontend changes, rerun `npm run build` if you want Flask to serve the new build.***
