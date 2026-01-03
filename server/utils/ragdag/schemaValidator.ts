/**
 * Schema validation and repair utility for OpenAI structured outputs
 * Ensures schemas are fully compliant with OpenAI's requirements
 */

interface ValidationError {
  path: string
  issue: string
  fixed: boolean
  fixApplied?: string
}

export class SchemaValidator {
  private errors: ValidationError[] = []
  
  /**
   * Main validation and repair function
   * Returns a validated and repaired schema ready for OpenAI API
   */
  validateAndRepair(schema: any, schemaName: string = 'schema'): {
    valid: boolean
    repaired: any
    errors: ValidationError[]
  } {
    this.errors = []
    
    if (!schema) {
      this.addError('root', 'Schema is null or undefined', false)
      return {
        valid: false,
        repaired: { type: 'object', properties: {}, additionalProperties: false },
        errors: this.errors
      }
    }
    
    const repaired = this.repairSchema(structuredClone(schema), schemaName)
    
    // Final validation pass
    const finalValid = this.isValidSchema(repaired, schemaName)
    
    return {
      valid: finalValid && this.errors.filter(e => !e.fixed).length === 0,
      repaired,
      errors: this.errors
    }
  }
  
  /**
   * Recursively repair a schema to meet OpenAI requirements
   */
  private repairSchema(schema: any, path: string = 'root'): any {
    // Handle non-object schemas (strings, nulls, etc)
    if (!schema || typeof schema !== 'object') {
      this.addError(path, `Schema is not an object (got ${typeof schema})`, true, 'Converted to string type')
      return { type: 'string', description: `Value at ${path}` }
    }
    
    // If schema is a plain string (common mistake: using description as schema)
    if (typeof schema === 'string') {
      this.addError(path, 'Schema is a plain string (possibly misplaced description)', true, 'Converted to proper schema object')
      return { type: 'string', description: schema }
    }
    
    // Clone to avoid mutations
    const result = { ...schema }
    
    // Ensure schema has a type field
    if (!result.type) {
      const inferredType = this.inferType(result)
      result.type = inferredType
      this.addError(path, `Missing type field`, true, `Inferred type: ${inferredType}`)
    }
    
    // Handle object types
    if (result.type === 'object') {
      // Add additionalProperties: false
      if (!('additionalProperties' in result)) {
        result.additionalProperties = false
        this.addError(path, 'Missing additionalProperties: false', true, 'Added additionalProperties: false')
      }
      
      // Process properties
      if (result.properties) {
        const newProperties: any = {}
        const propertyKeys: string[] = []
        
        for (const [key, value] of Object.entries(result.properties)) {
          const propPath = `${path}.properties.${key}`
          
          // Check if property value is a string (common mistake)
          if (typeof value === 'string') {
            this.addError(propPath, 'Property value is a string instead of schema object', true, 'Converted to proper schema')
            newProperties[key] = {
              type: 'string',
              description: value
            }
          } else if (!value || typeof value !== 'object') {
            this.addError(propPath, `Invalid property value (${typeof value})`, true, 'Converted to string schema')
            newProperties[key] = {
              type: 'string',
              description: `Property ${key}`
            }
          } else {
            // Recursively repair nested schemas
            newProperties[key] = this.repairSchema(value, propPath)
          }
          
          // Ensure property has required fields
          if (!newProperties[key].type) {
            const inferredType = this.inferType(newProperties[key])
            newProperties[key].type = inferredType
            this.addError(propPath, 'Property missing type field', true, `Added type: ${inferredType}`)
          }
          
          if (!newProperties[key].description) {
            newProperties[key].description = `Value for ${key}`
            this.addError(propPath, 'Property missing description', true, 'Added default description')
          }
          
          propertyKeys.push(key)
        }
        
        result.properties = newProperties
        
        // Ensure required array exists and includes all keys
        if (!result.required || !Array.isArray(result.required)) {
          result.required = propertyKeys
          this.addError(path, 'Missing or invalid required array', true, 'Added all properties to required')
        } else {
          // Add any missing keys to required
          const missingRequired = propertyKeys.filter(k => !result.required.includes(k))
          if (missingRequired.length > 0) {
            result.required = [...new Set([...result.required, ...missingRequired])]
            this.addError(path, 'Required array incomplete', true, `Added missing keys: ${missingRequired.join(', ')}`)
          }
        }
      } else if (result.type === 'object') {
        // Object with no properties
        result.properties = {}
        result.required = []
        this.addError(path, 'Object type with no properties', true, 'Added empty properties object')
      }
    }
    
    // Handle array types
    if (result.type === 'array') {
      if (!result.items) {
        result.items = { type: 'string', description: 'Array item' }
        this.addError(path, 'Array missing items schema', true, 'Added default string items')
      } else {
        result.items = this.repairSchema(result.items, `${path}.items`)
      }
      
      // OpenAI requires arrays to be wrapped in objects
      if (path === 'root') {
        this.addError(path, 'Root schema is array type', true, 'Wrapped in object container')
        return {
          type: 'object',
          properties: {
            items: result
          },
          required: ['items'],
          additionalProperties: false,
          description: 'Container for array response'
        }
      }
    }
    
    // Handle primitive types at root level
    if (path === 'root' && result.type !== 'object') {
      this.addError(path, `Root schema is ${result.type} type`, true, 'Wrapped in object container')
      return {
        type: 'object',
        properties: {
          value: result
        },
        required: ['value'],
        additionalProperties: false,
        description: 'Container for primitive response'
      }
    }
    
    // Recursively process nested schemas
    if (result.anyOf) {
      result.anyOf = result.anyOf.map((s: any, i: number) => 
        this.repairSchema(s, `${path}.anyOf[${i}]`))
    }
    if (result.oneOf) {
      result.oneOf = result.oneOf.map((s: any, i: number) => 
        this.repairSchema(s, `${path}.oneOf[${i}]`))
    }
    if (result.allOf) {
      result.allOf = result.allOf.map((s: any, i: number) => 
        this.repairSchema(s, `${path}.allOf[${i}]`))
    }
    
    return result
  }
  
  /**
   * Infer type from schema structure
   */
  private inferType(schema: any): string {
    if (!schema || typeof schema !== 'object') return 'string'
    
    if (schema.properties) return 'object'
    if (schema.items) return 'array'
    if (schema.enum) return 'string'
    if ('minimum' in schema || 'maximum' in schema) return 'number'
    if ('minLength' in schema || 'maxLength' in schema || 'pattern' in schema) return 'string'
    if (schema.anyOf || schema.oneOf || schema.allOf) {
      // Try to infer from first element
      const first = schema.anyOf?.[0] || schema.oneOf?.[0] || schema.allOf?.[0]
      if (first) return this.inferType(first)
    }
    
    return 'string' // Default fallback
  }
  
  /**
   * Final validation check
   */
  private isValidSchema(schema: any, path: string = 'root'): boolean {
    if (!schema || typeof schema !== 'object') {
      this.addError(path, 'Schema is not an object', false)
      return false
    }
    
    if (!schema.type) {
      this.addError(path, 'Missing type field', false)
      return false
    }
    
    if (schema.type === 'object') {
      if (!('additionalProperties' in schema)) {
        this.addError(path, 'Object missing additionalProperties field', false)
        return false
      }
      
      if (schema.properties) {
        if (!schema.required || !Array.isArray(schema.required)) {
          this.addError(path, 'Object missing or invalid required array', false)
          return false
        }
        
        for (const [key, value] of Object.entries(schema.properties)) {
          if (!value || typeof value !== 'object') {
            this.addError(`${path}.properties.${key}`, 'Property is not a valid schema object', false)
            return false
          }
          
          const propSchema = value as any
          if (!propSchema.type) {
            this.addError(`${path}.properties.${key}`, 'Property missing type field', false)
            return false
          }
          
          // Recursively validate nested schemas
          if (!this.isValidSchema(propSchema, `${path}.properties.${key}`)) {
            return false
          }
        }
      }
    }
    
    if (schema.type === 'array' && !schema.items) {
      this.addError(path, 'Array missing items field', false)
      return false
    }
    
    // Root level must be object for OpenAI
    if (path === 'root' && schema.type !== 'object') {
      this.addError(path, 'Root schema must be object type for OpenAI', false)
      return false
    }
    
    return true
  }
  
  private addError(path: string, issue: string, fixed: boolean, fixApplied?: string) {
    this.errors.push({ path, issue, fixed, fixApplied })
  }
  
  /**
   * Quick validation without repairs - returns boolean
   */
  static isValid(schema: any): boolean {
    const validator = new SchemaValidator()
    const result = validator.validateAndRepair(schema)
    return result.valid
  }
  
  /**
   * Quick repair without detailed error reporting
   */
  static repair(schema: any): any {
    const validator = new SchemaValidator()
    const result = validator.validateAndRepair(schema)
    return result.repaired
  }
  
  /**
   * Format validation errors for logging
   */
  static formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return 'No errors found'
    
    const unfixed = errors.filter(e => !e.fixed)
    const fixed = errors.filter(e => e.fixed)
    
    let output = ''
    
    if (fixed.length > 0) {
      output += '✅ Fixed issues:\n'
      fixed.forEach(e => {
        output += `  - ${e.path}: ${e.issue}`
        if (e.fixApplied) output += ` → ${e.fixApplied}`
        output += '\n'
      })
    }
    
    if (unfixed.length > 0) {
      output += '❌ Unfixed issues:\n'
      unfixed.forEach(e => {
        output += `  - ${e.path}: ${e.issue}\n`
      })
    }
    
    return output
  }
}

/**
 * Convenience function to validate and repair a schema
 */
export function validateAndRepairSchema(schema: any, schemaName?: string): any {
  const validator = new SchemaValidator()
  const result = validator.validateAndRepair(schema, schemaName)
  
  if (result.errors.length > 0) {
    console.log(`📋 Schema validation for ${schemaName || 'schema'}:`)
    console.log(SchemaValidator.formatErrors(result.errors))
  }
  
  return result.repaired
}
