<template>
  <div class="plan-visualization">
    <!-- View Mode Toggle -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <UButton
          @click="viewMode = 'tree'"
          :variant="viewMode === 'tree' ? 'solid' : 'ghost'"
          size="xs"
          icon="i-heroicons-list-bullet"
        >
          Tree View
        </UButton>
        <UButton
          @click="viewMode = 'flow'"
          :variant="viewMode === 'flow' ? 'solid' : 'ghost'"
          size="xs"
          icon="i-heroicons-squares-2x2"
        >
          Flow View
        </UButton>
        <UButton
          @click="viewMode = 'json'"
          :variant="viewMode === 'json' ? 'solid' : 'ghost'"
          size="xs"
          icon="i-heroicons-code-bracket"
        >
          JSON
        </UButton>
      </div>
      <div class="flex items-center gap-2">
        <USwitch v-model="showDetails" size="xs" />
        <span class="text-xs text-gray-600 dark:text-gray-400">Show Details</span>
      </div>
    </div>

    <!-- Tree View -->
    <div v-if="viewMode === 'tree'" class="space-y-2">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline" />
        Execution flow from input → final output
      </div>
      
      <!-- Input Node -->
      <div class="pl-0">
        <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
          <UIcon name="i-heroicons-arrow-down-on-square" class="w-4 h-4 text-blue-500" />
          <span class="text-sm font-medium text-gray-900 dark:text-white">Input Data</span>
        </div>
      </div>

      <!-- DAG Nodes -->
      <div class="space-y-1">
        <TreeNode
          v-for="node in rootNodes"
          :key="node.id"
          :node="node"
          :plan="plan"
          :completed-nodes="completedNodes"
          :show-details="showDetails"
          :depth="0"
          :expanded-nodes="expandedNodes"
          @toggle="toggleNode"
          @select="selectedNode = $event"
        />
      </div>

      <!-- Final Output -->
      <div class="pl-0 mt-3">
        <div class="flex items-center gap-2 p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <UIcon name="i-heroicons-arrow-up-on-square" class="w-4 h-4 text-primary-500" />
          <span class="text-sm font-medium text-primary-700 dark:text-primary-300">Final Output</span>
          <span class="text-xs text-primary-600 dark:text-primary-400">({{ finalNode?.description }})</span>
        </div>
      </div>
    </div>

    <!-- Flow View -->
    <div v-else-if="viewMode === 'flow'" class="space-y-4">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        <UIcon name="i-heroicons-information-circle" class="w-4 h-4 inline" />
        Node dependency graph showing execution stages
      </div>

      <!-- Stages -->
      <div v-for="(stage, index) in stages" :key="index" class="space-y-2">
        <div class="flex items-center gap-2 mb-2">
          <UBadge :color="index === 0 ? 'primary' : 'neutral'" size="xs">
            Stage {{ index + 1 }}
          </UBadge>
          <span class="text-xs text-gray-500">{{ stage.length }} node{{ stage.length !== 1 ? 's' : '' }} in parallel</span>
        </div>
        
        <div class="grid gap-2" :class="stage.length > 1 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'">
          <div
            v-for="node in stage"
            :key="node.id"
            @click="selectedNode = node"
            class="p-3 rounded-lg border-2 cursor-pointer transition-all"
            :class="{
              'border-green-500 bg-green-50 dark:bg-green-900/20': completedNodes.includes(node.id),
              'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400': !completedNodes.includes(node.id),
              'ring-2 ring-primary-500': selectedNode?.id === node.id
            }"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <UIcon 
                    :name="completedNodes.includes(node.id) ? 'i-heroicons-check-circle' : 'i-heroicons-circle-stack'"
                    :class="completedNodes.includes(node.id) ? 'text-green-500' : 'text-gray-400'"
                    class="w-4 h-4"
                  />
                  <span class="text-xs font-mono text-gray-500">{{ node.id }}</span>
                  <UIcon 
                    v-if="node.assetStatus === 'ready'"
                    name="i-heroicons-cpu-chip"
                    class="w-3 h-3 text-success-500"
                    title="Assets generated"
                  />
                </div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ node.description }}</p>
                
                <!-- Dependencies -->
                <div v-if="node.inputs.length > 0 && showDetails" class="mt-2 text-xs text-gray-500">
                  <span>Depends on: </span>
                  <span class="font-mono">{{ node.inputs.join(', ') }}</span>
                </div>

                <!-- Model & Temperature -->
                <div v-if="showDetails" class="mt-2 flex gap-3 text-xs text-gray-500">
                  <span v-if="node.model" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3" />
                    {{ node.model }}
                  </span>
                  <span v-if="node.temperature !== undefined" class="flex items-center gap-1">
                    <UIcon name="i-heroicons-fire" class="w-3 h-3" />
                    {{ node.temperature }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-document-text" class="w-3 h-3" />
                    {{ node.outputType }}
                  </span>
                </div>
              </div>
              <UIcon 
                v-if="node.id === plan.finalOutput"
                name="i-heroicons-flag"
                class="w-4 h-4 text-primary-500"
              />
            </div>
          </div>
        </div>

        <!-- Stage Connector -->
        <div v-if="index < stages.length - 1" class="flex justify-center py-2">
          <UIcon name="i-heroicons-arrow-down" class="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- JSON View -->
    <div v-else-if="viewMode === 'json'" class="overflow-x-auto">
      <pre class="text-xs p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">{{ JSON.stringify(plan, null, 2) }}</pre>
    </div>

    <!-- Node Details Modal -->
    <UModal v-model:open="modalOpen" @close="selectedNode = null">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cube" class="w-5 h-5 text-primary-500" />
          <span>Node Details: {{ selectedNode?.id }}</span>
        </div>
      </template>

      <div v-if="selectedNode" class="space-y-4">
        <!-- Description -->
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">Description</label>
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedNode.description }}</p>
        </div>

        <!-- Dependencies -->
        <div v-if="selectedNode.inputs.length > 0">
          <label class="text-xs text-gray-500 dark:text-gray-400">Dependencies</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <UBadge v-for="input in selectedNode.inputs" :key="input" variant="outline" size="xs">
              {{ input }}
            </UBadge>
          </div>
        </div>

        <!-- Prompt Template -->
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400">Prompt Template</label>
          <pre class="text-xs mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">{{ selectedNode.promptTemplate }}</pre>
        </div>

        <!-- System Prompt -->
        <div v-if="selectedNode.systemPrompt">
          <label class="text-xs text-gray-500 dark:text-gray-400">System Prompt</label>
          <pre class="text-xs mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">{{ selectedNode.systemPrompt }}</pre>
        </div>

        <!-- Configuration -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-400">Model</label>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedNode.model || 'Default' }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-400">Temperature</label>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedNode.temperature ?? 'Default' }}</p>
          </div>
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-400">Output Type</label>
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedNode.outputType }}</p>
          </div>
          <div v-if="selectedNode.id === plan.finalOutput">
            <label class="text-xs text-gray-500 dark:text-gray-400">Role</label>
            <UBadge color="primary" size="xs">Final Output</UBadge>
          </div>
        </div>

        <!-- JSON Schema -->
        <div v-if="selectedNode.jsonSchema">
          <label class="text-xs text-gray-500 dark:text-gray-400">JSON Schema</label>
          <pre class="text-xs mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto">{{ JSON.stringify(selectedNode.jsonSchema, null, 2) }}</pre>
        </div>

        <!-- Status -->
        <div v-if="completedNodes.includes(selectedNode.id)" class="pt-3 border-t border-gray-200 dark:border-gray-800">
          <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
            <span>Completed</span>
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TreeNode from './TreeNode.vue'

interface ExecutionAsset {
  generatedPrompt?: string
  systemPrompt?: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
  outputSchema?: any
  estimatedCost?: number
  estimatedTokens?: {
    prompt: number
    completion: number
  }
}

interface DAGNode {
  id: string
  description: string
  inputs: string[]
  promptTemplate: string
  outputType: 'text' | 'json'
  jsonSchema?: any
  model?: string
  temperature?: number
  systemPrompt?: string
  asset?: ExecutionAsset
  assetStatus?: 'pending' | 'generating' | 'ready' | 'error'
  assetError?: string
}

interface Plan {
  goal: string
  nodes: DAGNode[]
  finalOutput: string
}

const props = defineProps<{
  plan: Plan
  completedNodes: string[]
}>()

// State
const viewMode = ref<'tree' | 'flow' | 'json'>('tree')
const showDetails = ref(false)
const selectedNode = ref<DAGNode | null>(null)
const expandedNodes = ref<Set<string>>(new Set())

// Computed
const modalOpen = computed({
  get: () => !!selectedNode.value,
  set: (value) => {
    if (!value) selectedNode.value = null
  }
})
const nodeMap = computed(() => {
  const map = new Map<string, DAGNode>()
  props.plan.nodes.forEach(node => {
    map.set(node.id, node)
  })
  return map
})

const rootNodes = computed(() => {
  // Find nodes with no dependencies (root nodes)
  return props.plan.nodes.filter(node => node.inputs.length === 0)
})

const finalNode = computed(() => {
  return nodeMap.value.get(props.plan.finalOutput)
})

const stages = computed(() => {
  // Group nodes into execution stages based on dependencies
  const stages: DAGNode[][] = []
  const processed = new Set<string>()
  const remaining = [...props.plan.nodes]

  while (remaining.length > 0) {
    const stage: DAGNode[] = []
    
    for (let i = remaining.length - 1; i >= 0; i--) {
      const node = remaining[i]
      // Check if all dependencies are processed
      if (node.inputs.every(dep => processed.has(dep))) {
        stage.push(node)
        remaining.splice(i, 1)
      }
    }

    if (stage.length === 0 && remaining.length > 0) {
      // Circular dependency or error - just add remaining nodes
      stages.push(remaining)
      break
    }

    stage.forEach(node => processed.add(node.id))
    stages.push(stage)
  }

  return stages
})

// Methods
const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId)
  } else {
    expandedNodes.value.add(nodeId)
  }
}

// Expand all nodes initially
onMounted(() => {
  props.plan.nodes.forEach(node => {
    if (node.inputs.length > 0 || getDependentNodes(node.id).length > 0) {
      expandedNodes.value.add(node.id)
    }
  })
})

const getDependentNodes = (nodeId: string): DAGNode[] => {
  return props.plan.nodes.filter(node => node.inputs.includes(nodeId))
}
</script>

<style scoped>
.plan-visualization {
  @apply w-full;
}
</style>
