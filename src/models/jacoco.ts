export interface Report {
  name: string
  package?: Package[]
  counter?: Counter[]
}

export interface Package {
  name: string
  class?: Class[]
  sourcefile?: SourceFile[]
  counter?: Counter[]
}

interface Class {
  name: string
  sourcefilename?: string
  method?: Method[]
  counter?: Counter[]
}

interface Method {
  name: string
  desc: string
  counter?: Counter[]
}

interface SourceFile {
  name: string
  line?: Line[]
  counter?: Counter[]
}

interface Line {
  nr: number
  mi?: number
  ci?: number
  mb?: number
  cb?: number
}

export interface Counter {
  type: 'INSTRUCTION' | 'BRANCH' | 'LINE' | 'COMPLEXITY' | 'METHOD' | 'CLASS'
  missed: number
  covered: number
}
