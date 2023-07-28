import {promises as fsPromise} from 'fs'
import * as core from '@actions/core'

// https://docs.github.com/en/rest/checks/runs#create-a-check-run
export interface Annotation {
  path: string
  start_line: number
  end_line: number
  // start_column: number,
  // end_column: number,
  annotation_level: 'failure' | 'notice' | 'warning'
  message: string
  // title: string,
  // raw_details: string,
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
  coverageReportPath: string,
  baseCoverageReportPath: string
): Promise<Annotation[]> {
  const annotations: Annotation[] = []

  const coverageDataStr = await fsPromise.readFile(coverageReportPath, 'utf8')
  const branchCoverageData: CoverageData = JSON.parse(coverageDataStr)

  core.info(`Branch code coverage data length: ${branchCoverageData?.source_files.length}`)

  let baseCoverageData: CoverageData | null
  if (baseCoverageReportPath) {
    try {
      const baseCoverageDataStr = await fsPromise.readFile(baseCoverageReportPath, 'utf8')
      baseCoverageData = JSON.parse(baseCoverageDataStr)
    } catch (e) {
      baseCoverageData = null
      core.info(`Error dev report:${ e.message }`)
    }
  } else {
    baseCoverageData = null
  }

  core.info(`Base code coverage data length:, ${baseCoverageData?.source_files.length}`)

  const isCoverageSame = (sourceBranch : FileCoverage, baseBranch: FileCoverage) => baseBranch.name == sourceBranch.name
                                                                          && baseBranch.coverage == sourceBranch.coverage
                                                                          && baseBranch.source == sourceBranch.source

  let coverageData: FileCoverage[]
  if(baseCoverageData == null) {
    coverageData = branchCoverageData.source_files
    core.info("No Dev branch code coverage available")
  } else {
    coverageData = branchCoverageData.source_files.filter(
        coverageFile => !baseCoverageData?.source_files.some(baseCoverageFile => isCoverageSame(coverageFile, baseCoverageFile))
    )
  }

  core.info(`Final code coverage data length: ${coverageData.length}`)

  for (const sourceFile of coverageData) {
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
    const filename = sourceFile.name.replace(/^.*[\\\/]/, '')

    const coverageDroppedMessage = `• Coverage dropped to ${computedCoverage.toFixed(
      2
    )}% in ${filename}`
    annotations.push({
      path: filePath,
      start_line: 1,
      end_line: 1,
      annotation_level: 'failure',
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
          // Line numbers are 1-indexed
          start_line: coverageMissedStartIndex + 1,
          end_line: coverageMissedEndIndex + 1,
          annotation_level: 'failure',
          message: coverageMissedMessage
        })

        index = coverageMissedEndIndex
      }
    }

  }

  return annotations
}
