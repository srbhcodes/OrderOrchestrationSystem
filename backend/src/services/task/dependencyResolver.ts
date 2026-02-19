/**
 * Builds adjacency list: taskId -> list of taskIds it depends on (its dependencies).
 */
export function buildDependencyGraph(
  tasks: { taskId: string; dependsOn: string[] }[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const t of tasks) {
    graph.set(t.taskId, t.dependsOn || []);
  }
  return graph;
}

/**
 * DFS cycle detection. Returns true if the graph has a cycle.
 */
export function hasCycle(graph: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    if (recursionStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    recursionStack.add(node);
    for (const neighbor of graph.get(node) || []) {
      if (dfs(neighbor)) return true;
    }
    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (dfs(node)) return true;
  }
  return false;
}

/**
 * Topological sort (Kahn's algorithm). Returns taskIds in execution order.
 * Tasks with no dependencies first, then those whose deps are done.
 */
export function topologicalSort(
  tasks: { taskId: string; dependsOn: string[] }[]
): string[] {
  const graph = buildDependencyGraph(tasks);
  const inDegree = new Map<string, number>();

  for (const t of tasks) {
    inDegree.set(t.taskId, t.dependsOn?.length ?? 0);
  }

  const queue: string[] = [];
  const result: string[] = [];

  inDegree.forEach((degree, taskId) => {
    if (degree === 0) queue.push(taskId);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    graph.forEach((deps, taskId) => {
      if (deps.includes(current)) {
        const newDegree = (inDegree.get(taskId) ?? 0) - 1;
        inDegree.set(taskId, newDegree);
        if (newDegree === 0) queue.push(taskId);
      }
    });
  }

  return result;
}
