import * as core from '@actions/core'
import * as github from '@actions/github'
import {computeCoverage} from './computeCoverage'

const KEY_COVERAGE_REPORT_PATH = 'coverage_report_path'

const formatDate = (): string => {
  return new Date().toISOString();
}

async function run(): Promise<void> {
  try {
    const coverageReportPath: string = core.getInput(KEY_COVERAGE_REPORT_PATH)
    core.info(`Coverage report path: ${coverageReportPath}.`)

    if (!coverageReportPath) {
      core.setFailed('❌ Coverage report path not provided')
      return
    }

    const annotations = await computeCoverage(coverageReportPath)

    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN

    if (!token) {
      core.setFailed('❌ Missing Github token')
      return
    }

    const pullRequest = github.context.payload.pull_request
    const headSha = (pullRequest && pullRequest.head.sha) || github.context.sha
    const link = (pullRequest && pullRequest.html_url) || github.context.ref
    const isSuccessful = annotations.length === 0
    const conclusion: 'success' | 'failure' = isSuccessful
      ? 'success'
      : 'failure'
    const summary = isSuccessful
      ? 'Coverage stayed at 100%'
      : 'Coverage dropped'
    const status: 'completed' = 'completed'
    core.info(
      `ℹ️ Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${headSha})`
    )

    const createCoverageCheckRequest = {
      ...github.context.repo,
      name: 'Code Coverage',
      head_sha: headSha,
      started_at: formatDate(),
      status,
      conclusion,
      output: {
        title: 'Coverage check',
        summary,
        annotations: annotations.slice(0, 50)
      }
    }

    try {
      const octokit = github.getOctokit(token)
      await octokit.checks.create(createCoverageCheckRequest)

      // Instead of marking the job as failed if 'isSuccessful'
      // is false, we'll let the coverage check update the status.
    } catch (error) {
      core.error(`❌ Something went wrong: (${error})`)

      // Fail the build if there was an issue adding the check
      core.setFailed("❌ Could not create 'Coverage check'")
    }
  } catch (error) {
    // core.setFailed(error.message)
  }
}

run()
