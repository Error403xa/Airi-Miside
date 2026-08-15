import { object, optional, record, string, unknown } from 'valibot'

export const CreateModuleConfigSchema = object({
  moduleName: string(),
  config: optional(record(string(), unknown())),
})

export const UpdateModuleConfigSchema = object({
  config: optional(record(string(), unknown())),
})
