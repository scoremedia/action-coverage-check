import {readFileSync} from 'fs'
import {parseStringPromise} from 'xml2js'
import {context, getOctokit} from '@actions/github'
import {Annotation, TotalCoverageInfo} from './models/action'
import {convertObjToReport} from './util/jsonObjectToReport'
import {Report} from './models/jacoco'

export async function computeCoverageXML(
  coverageReportPath: string,
  token: string
): Promise<TotalCoverageInfo> {
  const annotations: Annotation[] = []

  // Read and parse the XML coverage report
  const jsonCoverage = await parseStringPromise(
    readFileSync(coverageReportPath, 'utf-8')
  )

  // Convert the parsed JSON object to the Report interface
  const report: Report = convertObjToReport(jsonCoverage.report)

  let totalMissed = 0
  let totalCovered = 0

  // Get changed files from the GitHub API
  const octokit = getOctokit(token)
  const {data: files} = await octokit.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request?.number || 0
  })

  for (const pkg of report.package || []) {
    for (const sourceFile of pkg.sourcefile || []) {
      // Calculate file coverage
      const missed =
        sourceFile.counter?.find(c => c.type == 'LINE')?.missed || 0
      const covered =
        sourceFile.counter?.find(c => c.type == 'LINE')?.covered || 0
      const total = missed + covered
      const fileCoverage = total === 0 ? 0 : (covered / total) * 100

      // Accumulate totals for overall coverage calculation
      totalMissed += missed
      totalCovered += covered

      // Determine the file path relative to the repository root
      const githubFile = files.find(function (f) {
        return f.filename.endsWith(`${pkg.name}/${sourceFile.name}`)
      })

      if (githubFile && fileCoverage < 90) {
        annotations.push({
          path: githubFile.filename,
          start_line: 1,
          end_line: 1,
          annotation_level: 'failure',
          coverage: fileCoverage,
          message: `Coverage dropped on to: ${fileCoverage.toFixed(2)}% in ${sourceFile.name}`
        })

        // Group consecutive missed lines and push a single annotation per range
        const missedRanges: {start: number; end: number}[] = []
        let rangeStart: number | null = null
        let prevNr: number | null = null

        // Identify ranges of missed lines
        for (const line of sourceFile.line || []) {
          if (line.ci === 0) {
            if (rangeStart === null) {
              rangeStart = line.nr
            } else if (prevNr !== null && line.nr !== prevNr + 1) {
              // Non-consecutive missed line, close previous range
              missedRanges.push({start: rangeStart, end: prevNr})
              rangeStart = line.nr
            }
            prevNr = line.nr
          } else if (rangeStart !== null) {
            missedRanges.push({start: rangeStart, end: prevNr!})
            rangeStart = null
            prevNr = null
          }
        }
        if (rangeStart !== null) {
          missedRanges.push({start: rangeStart, end: prevNr!})
        }

        // Create annotations for each missed range
        for (const range of missedRanges) {
          const message =
            range.start === range.end
              ? `Missed coverage on line: ${range.start}`
              : `Missed coverage on lines: ${range.start}-${range.end}`

          annotations.push({
            path: githubFile.filename,
            start_line: range.start,
            end_line: range.end,
            annotation_level: 'failure',
            coverage: 0,
            message: message
          })
        }
      }
    }
  }

  // Calculate overall coverage percentage
  const totalLines = totalMissed + totalCovered
  const totalCoverage = totalLines === 0 ? 1.0 : totalCovered / totalLines

  return {
    totalCoverage,
    annotations
  }
}
