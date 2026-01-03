<template>
  <div class="tree-node group">
    <div 
      @click="handleNodeClick"
      class="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
      :class="{
        'bg-green-50 dark:bg-green-900/20': isCompleted,
        'ring-2 ring-primary-500': isSelected
      }"
      :style="{ paddingLeft: `${depth * 1.5}rem` }"
    >
      <!-- Expand/Collapse Icon -->
      <button
        v-if="hasChildren"
        @click.stop="$emit('toggle', node.id)"
        class="mt-0.5 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
      >
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
      </button>
      <div v-else class="w-4"></div>

      <!-- Node Status Icon -->
      <UIcon
        :name="statusIcon"
        :class="statusColor"
        class="w-4 h-4 mt-0.5 flex-shrink-0"
      />

      <!-- Node Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ node.description }}
          </span>
          <span class="text-xs font-mono text-gray-500">({{ node.id }})</span>
          
          <!-- Badges -->
          <UBadge 
            v-if="node.id === plan.finalOutput" 
            color="primary" 
            size="xs"
          >
            Final Output
          </UBadge>
          <UBadge 
            v-if="node.assetStatus === 'ready'" 
            color="success" 
            variant="soft"
            size="xs"
          >
            <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3 mr-1" />
            Assets
          </UBadge>
        </div>

        <!-- Node Details (when expanded) -->
        <div v-if="showDetails" class="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <!-- Dependencies -->
          <div v-if="node.inputs.length > 0" class="flex items-center gap-1">
            <span class="text-gray-500">Depends on:</span>
            <span v-for="(input, idx) in node.inputs" :key="input" class="font-mono">
              {{ input }}<span v-if="idx < node.inputs.length - 1">,</span>
            </span>
          </div>

          <!-- Model Info -->
          <div class="flex items-center gap-3">
            <span v-if="node.model" class="flex items-center gap-1">
              <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3" />
              {{ node.model }}
            </span>
            <span v-if="node.temperature !== undefined" class="flex items-center gap-1">
              <UIcon name="i-heroicons-fire" class="w-3 h-3" />
              Temp: {{ node.temperature }}
            </span>
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-document-text" class="w-3 h-3" />
              {{ node.outputType }}
            </span>
            <span v-if="node.asset?.estimatedCost" class="flex items-center gap-1">
              <UIcon name="i-heroicons-currency-dollar" class="w-3 h-3" />
              ${{ node.asset.estimatedCost.toFixed(4) }}
            </span>
          </div>

          <!-- Prompt Preview -->
          <div v-if="isExpanded && node.promptTemplate" class="mt-2">
            <div class="text-gray-500 mb-1">Prompt template:</div>
            <div class="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono whitespace-pre-wrap line-clamp-3">{{ node.promptTemplate }}</div>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click.stop="$emit('select', node)"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <UIcon 
          name="i-heroicons-information-circle" 
          class="w-4 h-4 text-gray-400 hover:text-primary-500"
        />
      </button>
    </div>

    <!-- Children Nodes -->
    <div v-if="hasChildren && isExpanded" class="mt-1">
      <TreeNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :plan="plan"
        :completed-nodes="completedNodes"
        :show-details="showDetails"
        :depth="depth + 1"
        :expanded-nodes="expandedNodes"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  node: DAGNode
  plan: Plan
  completedNodes: string[]
  showDetails: boolean
  depth: number
  expandedNodes: Set<string>
}>()

const emit = defineEmits<{
  toggle: [nodeId: string]
  select: [node: DAGNode]
}>()

// Computed
const isCompleted = computed(() => props.completedNodes.includes(props.node.id))
const isExpanded = computed(() => props.expandedNodes.has(props.node.id))
const isSelected = computed(() => false) // Can be connected to a selected state if needed

const children = computed(() => {
  // Find nodes that depend on this node
  return props.plan.nodes.filter(n => n.inputs.includes(props.node.id))
})

const hasChildren = computed(() => children.value.length > 0)

const statusIcon = computed(() => {
  if (isCompleted.value) return 'i-heroicons-check-circle'
  if (props.node.id === props.plan.finalOutput) return 'i-heroicons-flag'
  return 'i-heroicons-circle-stack'
})

const statusColor = computed(() => {
  if (isCompleted.value) return 'text-green-500'
  if (props.node.id === props.plan.finalOutput) return 'text-primary-500'
  return 'text-gray-400'
})

// Methods
const handleNodeClick = () => {
  if (hasChildren.value) {
    emit('toggle', props.node.id)
  }
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
