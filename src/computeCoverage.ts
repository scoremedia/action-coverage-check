import {promises as fsPromise} from 'fs'

export interface Annotation {
  path: string
  start_line: number
  end_line: number
  annotation_level: 'failure' | 'notice' | 'warning'
  message: string
}

interface FileCoverage {
  coverage: number[]
  source: string
  name: string
}

interface CoverageData {
  source_files: FileCoverage[]
}

export async function computeCoverage(
  coverageReportPath: string
): Promise<Annotation[]> {
  const annotations: Annotation[] = []

  const coverageDataStr = await fsPromise.readFile(coverageReportPath, 'utf8')
  const coverageData: CoverageData = JSON.parse(coverageDataStr)

  coverageData.source_files
    .filter(
      sourceFile =>
        sourceFile.coverage.filter(coverageValue => coverageValue === 0)
          .length > 0
    )
    .forEach(sourceFile => {
      const missed = sourceFile.coverage.filter(
        coverageValue => coverageValue === 0
      ).length
      const total = sourceFile.coverage.filter(
        coverageValue => coverageValue === null
      ).length
      const computedCoverage =
        (total === 0 ? 1.0 : (total - missed) / total) * 100
      const path = sourceFile.name

      for (let index = 0; index < sourceFile.coverage.length; index++) {
        if (sourceFile.coverage[index] === 0) {
          // coverage array is 0-indexed.
          // We'll need to adjust these by
          // +1 to get line numbers.
          const coverageMissedStartIndex = index
          let coverageMissedEndIndex = index
          while (
            coverageMissedEndIndex + 1 < sourceFile.coverage.length &&
            sourceFile.coverage[coverageMissedEndIndex + 1] === 0
          ) {
            coverageMissedEndIndex++
          }

          annotations.push({
            path,
            // Line numbers are 1-indexed
            start_line: coverageMissedStartIndex + 1,
            end_line: coverageMissedEndIndex + 1,
            annotation_level: 'failure',
            message: 'Missed coverage'
          })

          index = coverageMissedEndIndex
        }
      }

      const coverageDroppedMessage = `Coverage dropped to ${computedCoverage.toFixed(
        2
      )}%.`

      annotations.push({
        path,
        start_line: 1,
        end_line: 1,
        annotation_level: 'failure',
        message: coverageDroppedMessage
      })
    })

  return annotations
}
