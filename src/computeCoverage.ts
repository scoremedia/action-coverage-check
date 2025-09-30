import {promises as fsPromise} from 'fs'
import { Annotation, TotalCoverageInfo } from './models/action'

export interface FileCoverage {
  coverage: number[]
  source: string
  name: string
}

export interface CoverageData {
  source_files: FileCoverage[]
}

export async function computeCoverage(
  coverageReportPath: string
): Promise<TotalCoverageInfo> {
  const annotations: Annotation[] = []

  const coverageDataStr = await fsPromise.readFile(coverageReportPath, 'utf8')
  const coverageData: CoverageData = JSON.parse(coverageDataStr)

  for (const sourceFile of coverageData.source_files) {
    if (
      sourceFile.coverage.filter(coverageValue => coverageValue === 0).length <=
      0
    )
      continue

    const missed = sourceFile.coverage.filter(
      coverageValue => coverageValue === 0
    ).length
    const total = sourceFile.coverage.filter(
      coverageValue => coverageValue === null
    ).length
    const computedCoverage =
      (total === 0 ? 1.0 : (total - missed) / total) * 100
    const filePath = sourceFile.name.replace(/^..\//, '')
    const filename = sourceFile.name.replace(/^.*[\\/]/, '')

    const coverageDroppedMessage = `• Coverage dropped to ${computedCoverage.toFixed(
      2
    )}% in ${filename}`
    annotations.push({
      path: filePath,
      start_line: 1,
      end_line: 1,
      annotation_level: 'failure',
      coverage: computedCoverage,
      message: coverageDroppedMessage
    })

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

        let coverageMissedMessage = '- Missed coverage'
        if (coverageMissedEndIndex > coverageMissedStartIndex) {
          coverageMissedMessage += ` between lines ${coverageMissedStartIndex + 1} and ${coverageMissedEndIndex + 1}`
        } else {
          coverageMissedMessage += ` on line ${coverageMissedStartIndex + 1}`
        }

        annotations.push({
          path: filePath,
          start_line: coverageMissedStartIndex + 1,
          end_line: coverageMissedEndIndex + 1,
          annotation_level: 'failure',
          coverage: computedCoverage,
          message: coverageMissedMessage
        })

        index = coverageMissedEndIndex
      }
    }
  }

  const totalCoverage = annotations.reduce(
    (accumulator, current_value) => accumulator + current_value.coverage,
    0
  )
  return {totalCoverage, annotations}
}
