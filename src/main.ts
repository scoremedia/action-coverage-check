import * as core from '@actions/core'
import * as github from '@actions/github'
import {computeCoverageXML} from './computeCoverageXML'

const KEY_COVERAGE_REPORT_PATH = 'coverage_report_path'
const IDENTIFIER = '513410c6-a258-11ed-a8fc-0242ac120002'

async function run(): Promise<void> {
  try {
    const coverageReportPath: string = core.getInput(KEY_COVERAGE_REPORT_PATH)
    core.info(`Coverage report path: ${coverageReportPath}.`)

    if (!coverageReportPath) {
      core.setFailed('❌ Coverage report path not provided')
      return
    }

    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN

    if (!token) {
      core.setFailed('❌ Missing Github token')
      return
    }

    if (!coverageReportPath.endsWith('.xml')) {
      core.setFailed('❌ Invalid coverage report format, expected .xml')
    }

    const totalCoverageInfo = await computeCoverageXML(
      coverageReportPath,
      token
    )

    const pullRequest = github.context.payload.pull_request
    const headSha = (pullRequest && pullRequest.head.sha) || github.context.sha
    const link = (pullRequest && pullRequest.html_url) || github.context.ref
    const isSuccessful =
      totalCoverageInfo.totalCoverage >= 0.8 &&
      totalCoverageInfo.annotations.length === 0
    const totalCoverageStr = (totalCoverageInfo.totalCoverage * 100).toFixed(2)
    const conclusion: 'success' | 'failure' = isSuccessful
      ? 'success'
      : 'failure'
    const summary = isSuccessful
      ? 'No coverage dropped detected, overall project coverage stayed above 80%.'
      : 'Coverage dropped detected, ' +
        (totalCoverageInfo.annotations.length > 0
          ? `${totalCoverageInfo.annotations.length} issues found, check annotations`
          : 'overall project coverage dropped below 80%.')
    const status = 'completed'
    core.info(
      `ℹ️ Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${headSha}`
    )

    const title = `${totalCoverageInfo.annotations.length > 50 ? '50 of ' : ''}${totalCoverageInfo.annotations.length} coverage issues:`

    const octokit = github.getOctokit(token)

    // create GitHub pull request Check w/ Annotation
    // https://docs.github.com/en/rest/checks/runs#create-a-check-run
    const annotationsSlice = totalCoverageInfo.annotations.slice(0, 50)
    const checkRequest = await octokit.rest.checks.create({
      ...github.context.repo,
      name: 'report code coverage',
      head_sha: headSha,
      status,
      conclusion,
      output: {
        title,
        summary,
        annotations: annotationsSlice
      }
    })

    if (pullRequest) {
      const {
        repo: {repo: repoName, owner: repoOwner}
      } = github.context
      const defaultParameter = {
        repo: repoName,
        owner: repoOwner
      }
      // Find unique comments
      const {data: comments} = await octokit.rest.issues.listComments({
        ...defaultParameter,
        issue_number: pullRequest.number
      })
      const targetComments = comments.filter(c => c?.body?.includes(IDENTIFIER))
      // Delete previous comment if exist
      for (const comment of targetComments) {
        await octokit.rest.issues.deleteComment({
          ...defaultParameter,
          comment_id: comment.id
        })
        core.info(`Comment successfully delete for id: ${String(comment.id)}`)
      }
      if (!isSuccessful) {
        const checkId = checkRequest.data.id
        const commentBody =
          `:x: Uh-oh! ${totalCoverageInfo.annotations.length > 0 ? `Coverage dropped on changed files: ${totalCoverageInfo.annotations.length} issues found.` : 'Overall project coverage dropped:'} ` +
          `https://github.com/${repoOwner}/${repoName}/runs/${String(checkId)}` +
          `\nOverall Project Coverage: ${totalCoverageStr}% ` +
          '\n' +
          '<!--  ' +
          IDENTIFIER +
          ' -->'
        await octokit.rest.issues.createComment({
          ...defaultParameter,
          issue_number: pullRequest.number,
          body: commentBody
        })
      } else {
        const commentBody =
          `:white_check_mark: Overall Project Coverage: ${totalCoverageStr}% ` +
          '\n' +
          '<!--  ' +
          IDENTIFIER +
          ' -->'
        await octokit.rest.issues.createComment({
          ...defaultParameter,
          issue_number: pullRequest.number,
          body: commentBody
        })
      }
    }
    if (!isSuccessful) {
      core.setFailed('❌ Coverage dropped')
    }
  } catch (error) {
    let errorMessage = 'Failed to check coverage'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.log(errorMessage)
  }
}

run()
