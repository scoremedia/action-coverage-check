import * as core from '@actions/core'
import * as github from '@actions/github'
import {computeCoverage} from './computeCoverage'

async function run(): Promise<void> {
  try {
    const coverageReportPath: string = core.getInput('coverage_report_path')
    core.info(`Coverage report path: ${coverageReportPath}.`)

    const annotations = await computeCoverage(coverageReportPath)

    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN

    if (!token) {
      core.setFailed('❌ Missing Github token')
      return
    }

    const pullRequest = github.context.payload.pull_request
    const headSha = (pullRequest && pullRequest.head.sha) || github.context.sha
    const link = (pullRequest && pullRequest.html_url) || github.context.ref
    const conclusion: 'success' | 'failure' =
      annotations.length === 0 ? 'success' : 'failure'
    const status: 'completed' = 'completed'
    core.info(
      `ℹ️ Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${headSha})`
    )

    const createCheckRequest = {
      ...github.context.repo,
      name: 'Code Coverage',
      head_sha: headSha,
      status,
      conclusion,
      output: {
        title: 'Test title',
        summary: 'Test summary',
        annotations: annotations.slice(0, 50)
      }
    }

    try {
      const octokit = github.getOctokit(token)
      await octokit.checks.create(createCheckRequest)

      if (conclusion === 'failure') {
        core.setFailed('❌ Missed code coverage')
      }
    } catch (error) {
      core.error(`❌ Something went wrong: (${error})`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
