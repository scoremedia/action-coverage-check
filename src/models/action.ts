export interface TotalCoverageInfo {
  totalCoverage: number
  annotations: Annotation[]
}

// https://docs.github.com/en/rest/checks/runs#create-a-check-run
export interface Annotation {
  path: string
  start_line: number
  end_line: number
  coverage: number
  // start_column: number,
  // end_column: number,
  annotation_level: 'failure' | 'notice' | 'warning'
  message: string
  // title: string,
  // raw_details: string,
}
