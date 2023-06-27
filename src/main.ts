import * as core from '@actions/core'
import * as github from '@actions/github'
import { computeCoverage } from './computeCoverage'

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

    const outputTitle = `${annotations.length > 50 ? "50 of " : ""}${annotations.length} coverage issues:`

    const octokit = github.getOctokit(token)

    // create GitHub pull request Check w/ Annotation
    // https://docs.github.com/en/rest/checks/runs#create-a-check-run
    const checkRequest = await octokit.checks.create({
      ...github.context.repo,
      name: 'report code coverage',
      head_sha: headSha,
      status,
      conclusion,
      output: {
        title: outputTitle,
        summary,
        annotations: annotations.slice(0, 50)
      }
    })

    if (pullRequest) {
      const {
        repo: { repo: repoName, owner: repoOwner }
      } = github.context
      const defaultParameter = {
        repo: repoName,
        owner: repoOwner
      }
      // Find unique comments
      const { data: comments } = await octokit.issues.listComments({
        ...defaultParameter,
        issue_number: pullRequest.number
      })
      const targetComment = comments.find(c => {
        return c?.body?.includes(IDENTIFIER)
      })
      // Delete previous comment if exist
      if (targetComment) {
        await octokit.issues.deleteComment({
          ...defaultParameter,
          comment_id: targetComment.id
        })
        core.info(
          `Comment successfully delete for id: ${String(targetComment.id)}`
        )
      }
      if (!isSuccessful) {
        const checkId = checkRequest.data.id
        let commentBody = ''
        commentBody +=
          'Uh-oh! Coverage dropped: ' +
          `https://github.com/${repoOwner}/${repoName}/runs/${String(checkId)}` +
          '\n'
        // commentBody += '<details>' + '\n'
        // commentBody += '<summary>Details</summary>' + '\n'
        // commentBody += '```' + '\n'
        // annotations.slice(0, 10).forEach(annotation => {
        // commentBody += '-----' + '\n'
        // commentBody += '- path: ' + annotation.path + '.' + '\n'
        // commentBody += '- start_line: ' + annotation.start_line + '.' + '\n'
        // commentBody += '- end_line: ' + annotation.end_line + '.' + '\n'
        // commentBody += '- annotation_level: ' + annotation.annotation_level + '.' + '\n'
        // commentBody += '- message: ' + annotation.message + '.' + '\n'
        // commentBody += '-----' + '\n'
        // })
        // commentBody += '```' + '\n'
        // commentBody += '</details>' + '\n'
        commentBody += '<!--  ' + IDENTIFIER + ' -->'
        // Create comment
        await octokit.issues.createComment({
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
    core.setFailed(error.message)
  }
}

run()
