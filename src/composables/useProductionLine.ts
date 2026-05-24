import { reactive, computed } from 'vue'
import type {
  ProductionNode,
  SourceNode,
  FacilityNode,
  SinkNode,
  FlowEdge,
  Diagnostic,
  Port,
} from '@/types'
import { getFacility, getRecipe, getItem } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let nextId = 1
function genId(prefix: string): string {
  return `${prefix}_${nextId++}`
}

interface ProductionLineState {
  id: string
  name: string
  nodes: Map<string, ProductionNode>
  edges: Map<string, FlowEdge>
  diagnostics: Diagnostic[]
}

function createEmptyLine(id?: string): ProductionLineState {
  return reactive({
    id: id ?? genId('line'),
    name: '',
    nodes: reactive(new Map<string, ProductionNode>()),
    edges: reactive(new Map<string, FlowEdge>()),
    diagnostics: [],
  })
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useProductionLine(initialId?: string) {
  const line = createEmptyLine(initialId)

  // ---- Derived: resolved ports per facility node ----
  const resolvedPorts = computed(() => {
    const map = new Map<string, { inputs: Port[]; outputs: Port[] }>()
    for (const [nodeId, node] of line.nodes) {
      if (node.type !== 'facility') continue
      const facility = getFacility(node.facilityId)
      const recipe = getRecipe(node.recipeId)
      if (!facility || !recipe) continue
      map.set(nodeId, resolvePorts(facility, recipe))
    }
    return map
  })

  // ---- Node CRUD ----

  function addSource(patch: Omit<SourceNode, 'id' | 'type'>): string {
    const id = genId('src')
    const node: SourceNode = { ...patch, id, type: 'source' }
    line.nodes.set(id, node)
    runDiagnostics()
    return id
  }

  function addFacility(patch: Omit<FacilityNode, 'id' | 'type'>): string {
    const id = genId('fac')
    const node: FacilityNode = { ...patch, id, type: 'facility' }
    line.nodes.set(id, node)
    runDiagnostics()
    return id
  }

  function addSink(patch: Omit<SinkNode, 'id' | 'type'>): string {
    const id = genId('sink')
    const node: SinkNode = { ...patch, id, type: 'sink' }
    line.nodes.set(id, node)
    runDiagnostics()
    return id
  }

  function updateNode(id: string, patch: Partial<Omit<ProductionNode, 'id' | 'type'>>) {
    const node = line.nodes.get(id)
    if (!node) return
    Object.assign(node, patch)
    runDiagnostics()
  }

  function removeNode(id: string) {
    // Remove edges connected to this node
    for (const [edgeId, edge] of line.edges) {
      if (edge.sourceId === id || edge.targetId === id) {
        line.edges.delete(edgeId)
      }
    }
    line.nodes.delete(id)
    runDiagnostics()
  }

  // ---- Edge CRUD ----

  function addEdge(patch: Omit<FlowEdge, 'id'>): string {
    const id = genId('edge')
    const edge: FlowEdge = { ...patch, id }
    line.edges.set(id, edge)
    runDiagnostics()
    return id
  }

  function updateEdge(id: string, patch: Partial<Omit<FlowEdge, 'id'>>) {
    const edge = line.edges.get(id)
    if (!edge) return
    Object.assign(edge, patch)
    runDiagnostics()
  }

  function removeEdge(id: string) {
    line.edges.delete(id)
    runDiagnostics()
  }

  // ---- Diagnostics ----

  function runDiagnostics() {
    const diagnostics: Diagnostic[] = []

    // Build per-node edge lists
    const edgesIn = new Map<string, FlowEdge[]>()
    const edgesOut = new Map<string, FlowEdge[]>()
    for (const edge of line.edges.values()) {
      let arr = edgesIn.get(edge.targetId)
      if (!arr) {
        arr = []
        edgesIn.set(edge.targetId, arr)
      }
      arr.push(edge)

      arr = edgesOut.get(edge.sourceId)
      if (!arr) {
        arr = []
        edgesOut.set(edge.sourceId, arr)
      }
      arr.push(edge)
    }

    for (const [nodeId, node] of line.nodes) {
      if (node.type === 'source') {
        diagnoseSource(nodeId, node, edgesOut.get(nodeId) ?? [], diagnostics)
      } else if (node.type === 'facility') {
        diagnoseFacility(
          nodeId,
          node,
          edgesIn.get(nodeId) ?? [],
          edgesOut.get(nodeId) ?? [],
          diagnostics,
        )
      } else if (node.type === 'sink') {
        diagnoseSink(nodeId, node, edgesIn.get(nodeId) ?? [], diagnostics)
      }
    }

    // Cycle detection
    detectCycles(diagnostics)

    line.diagnostics = diagnostics
  }

  // ---- Source diagnostics ----

  function diagnoseSource(
    nodeId: string,
    node: SourceNode,
    outEdges: FlowEdge[],
    diagnostics: Diagnostic[],
  ) {
    const totalOut = outEdges.reduce((s, e) => s + e.rate, 0)
    if (totalOut > node.rate) {
      diagnostics.push({
        nodeId,
        level: 'warning',
        kind: 'overproduction',
        message: `Source output rate (${totalOut.toFixed(2)}) exceeds supply (${node.rate.toFixed(2)})`,
        relatedEdges: outEdges.map((e) => e.id),
      })
    } else if (totalOut < node.rate) {
      diagnostics.push({
        nodeId,
        level: 'info',
        kind: 'underproduction',
        message: `Source output rate (${totalOut.toFixed(2)}) below supply (${node.rate.toFixed(2)})`,
        relatedEdges: outEdges.map((e) => e.id),
      })
    }

    // Check item mismatch on outgoing edges
    for (const edge of outEdges) {
      if (edge.itemId !== node.itemId) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'wrong_item',
          message: `Edge carries ${edge.itemId} but source provides ${node.itemId}`,
          relatedEdges: [edge.id],
        })
      }
    }
  }

  // ---- Facility diagnostics ----

  function diagnoseFacility(
    nodeId: string,
    node: FacilityNode,
    inEdges: FlowEdge[],
    outEdges: FlowEdge[],
    diagnostics: Diagnostic[],
  ) {
    const recipe = getRecipe(node.recipeId)
    if (!recipe) return

    const facility = getFacility(node.facilityId)
    if (!facility) return

    const cycleRate = 1 / recipe.craftingTime
    const count = node.count

    // Expected rates
    const expectedIn = new Map<string, number>()
    for (const ri of recipe.inputs) {
      expectedIn.set(ri.itemId, (expectedIn.get(ri.itemId) ?? 0) + ri.amount * cycleRate * count)
    }
    const expectedOut = new Map<string, number>()
    for (const ri of recipe.outputs) {
      expectedOut.set(ri.itemId, (expectedOut.get(ri.itemId) ?? 0) + ri.amount * cycleRate * count)
    }

    // Actual rates from edges
    const actualIn = new Map<string, number>()
    for (const edge of inEdges) {
      actualIn.set(edge.itemId, (actualIn.get(edge.itemId) ?? 0) + edge.rate)
    }
    const actualOut = new Map<string, number>()
    for (const edge of outEdges) {
      actualOut.set(edge.itemId, (actualOut.get(edge.itemId) ?? 0) + edge.rate)
    }

    // Check input rates
    for (const [itemId, expected] of expectedIn) {
      const actual = actualIn.get(itemId) ?? 0
      if (actual < expected) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'underproduction',
          message: `Input ${itemId}: need ${expected.toFixed(2)}/s, got ${actual.toFixed(2)}/s`,
          relatedEdges: inEdges.filter((e) => e.itemId === itemId).map((e) => e.id),
        })
      }
    }

    // Check output rates
    for (const [itemId, expected] of expectedOut) {
      const actual = actualOut.get(itemId) ?? 0
      if (actual > expected) {
        diagnostics.push({
          nodeId,
          level: 'warning',
          kind: 'overproduction',
          message: `Output ${itemId}: can produce ${expected.toFixed(2)}/s, edges carry ${actual.toFixed(2)}/s`,
          relatedEdges: outEdges.filter((e) => e.itemId === itemId).map((e) => e.id),
        })
      }
    }

    // Check port mismatches — edges pointing to non-existent ports
    const ports = resolvePorts(facility, recipe)
    const inPortItemSet = new Set(ports.inputs.map((p) => p.itemId).filter(Boolean))
    const outPortItemSet = new Set(ports.outputs.map((p) => p.itemId).filter(Boolean))

    for (const edge of inEdges) {
      if (!inPortItemSet.has(edge.itemId)) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'port_mismatch',
          message: `No input port for ${edge.itemId} on this recipe`,
          relatedEdges: [edge.id],
        })
      }
    }
    for (const edge of outEdges) {
      if (!outPortItemSet.has(edge.itemId)) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'port_mismatch',
          message: `No output port for ${edge.itemId} on this recipe`,
          relatedEdges: [edge.id],
        })
      }
    }

    // Check transport type consistency
    for (const edge of inEdges) {
      const item = getItem(edge.itemId)
      const edgeType = item?.transportType ?? 'belt'
      if (edge.transportType !== edgeType) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'port_mismatch',
          message: `Edge transport type (${edge.transportType}) doesn't match item ${edge.itemId} (${edgeType})`,
          relatedEdges: [edge.id],
        })
      }
    }
  }

  // ---- Sink diagnostics ----

  function diagnoseSink(
    nodeId: string,
    node: SinkNode,
    inEdges: FlowEdge[],
    diagnostics: Diagnostic[],
  ) {
    const totalIn = inEdges.reduce((s, e) => s + e.rate, 0)
    if (totalIn < node.rate) {
      diagnostics.push({
        nodeId,
        level: 'warning',
        kind: 'underproduction',
        message: `Sink input rate (${totalIn.toFixed(2)}) below demand (${node.rate.toFixed(2)})`,
        relatedEdges: inEdges.map((e) => e.id),
      })
    }

    for (const edge of inEdges) {
      if (edge.itemId !== node.itemId) {
        diagnostics.push({
          nodeId,
          level: 'error',
          kind: 'wrong_item',
          message: `Edge carries ${edge.itemId} but sink expects ${node.itemId}`,
          relatedEdges: [edge.id],
        })
      }
    }
  }

  // ---- Cycle detection ----

  function detectCycles(diagnostics: Diagnostic[]) {
    const nodeIds = new Set(line.nodes.keys())
    const adjacency = new Map<string, Set<string>>()
    for (const edge of line.edges.values()) {
      let set = adjacency.get(edge.sourceId)
      if (!set) {
        set = new Set()
        adjacency.set(edge.sourceId, set)
      }
      set.add(edge.targetId)
    }

    // Find all SCCs using iterative Tarjan's algorithm
    let index = 0
    const stack: string[] = []
    const onStack = new Set<string>()
    const indices = new Map<string, number>()
    const lowlinks = new Map<string, number>()

    function strongconnect(v: string) {
      indices.set(v, index)
      lowlinks.set(v, index)
      index++
      stack.push(v)
      onStack.add(v)

      const neighbors = adjacency.get(v)
      if (neighbors) {
        for (const w of neighbors) {
          if (!indices.has(w)) {
            strongconnect(w)
            lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!))
          } else if (onStack.has(w)) {
            lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!))
          }
        }
      }

      if (lowlinks.get(v) === indices.get(v)) {
        const scc: string[] = []
        let w: string
        do {
          w = stack.pop()!
          onStack.delete(w)
          scc.push(w)
        } while (w !== v)

        if (scc.length > 1) {
          const edgeIds: string[] = []
          for (const edge of line.edges.values()) {
            if (scc.includes(edge.sourceId) && scc.includes(edge.targetId)) {
              edgeIds.push(edge.id)
            }
          }
          diagnostics.push({
            level: 'info',
            kind: 'cycle_detected',
            message: `Cycle detected: ${scc.length} nodes in loop`,
            relatedEdges: edgeIds,
          })
        }
        // Self-loop (single node pointing to itself)
        if (scc.length === 1) {
          const neighbors = adjacency.get(v)
          if (neighbors?.has(v)) {
            const edgeIds: string[] = []
            for (const edge of line.edges.values()) {
              if (edge.sourceId === v && edge.targetId === v) {
                edgeIds.push(edge.id)
              }
            }
            diagnostics.push({
              level: 'info',
              kind: 'cycle_detected',
              message: `Self-loop detected on node ${v}`,
              relatedEdges: edgeIds,
            })
          }
        }
      }
    }

    for (const nodeId of nodeIds) {
      if (!indices.has(nodeId)) {
        strongconnect(nodeId)
      }
    }
  }

  // ---- Serialization ----

  function toJSON() {
    return {
      id: line.id,
      name: line.name,
      nodes: Array.from(line.nodes.entries()),
      edges: Array.from(line.edges.values()),
    }
  }

  function fromJSON(data: {
    id: string
    name: string
    nodes: [string, ProductionNode][]
    edges: FlowEdge[]
  }) {
    line.id = data.id
    line.name = data.name
    line.nodes.clear()
    line.edges.clear()
    for (const [id, node] of data.nodes) {
      line.nodes.set(id, node)
    }
    for (const edge of data.edges) {
      line.edges.set(edge.id, edge)
    }
    runDiagnostics()
  }

  return {
    line,
    resolvedPorts,

    // Node CRUD
    addSource,
    addFacility,
    addSink,
    updateNode,
    removeNode,

    // Edge CRUD
    addEdge,
    updateEdge,
    removeEdge,

    // Diagnostics
    runDiagnostics,

    // Serialization
    toJSON,
    fromJSON,
  }
}
