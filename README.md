# Coverage check

Action that parses a coverage-report to pass/fail a build. Code annotations are added to failed builds using Github Checks API.

### Inputs

| **Input**              | **Description**                                                                                                                                                       |
|------------------------|-----------------------------------------------------------------------|
| `coverage_report_path` | **Required**. Path to the JSON file that contains coverage report.    |
| `github_token`         | **Required**. Token used to create a check using Github API.          |

## Sample

```yml
name: CI
on: [push]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      ...
      ...
      - name: Run Jacoco and Coveralls
        run: # generate coverage report
      - name: Coverage check
        uses: scoremedia/coverage-check@v0.0.1
        with:
          coverage_report_path: 'build/coveralls/report.json'
          github_token: ${{ secrets.GITHUB_TOKEN }}
```