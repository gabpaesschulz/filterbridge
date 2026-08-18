---
'@filterbridge/react': patch
'@filterbridge/browser': patch
---

Run the React test suites against React 19 as well as React 18.

No library code changed — both packages already worked on React 19, and now the
`react: >=18` peer range is checked rather than only declared. `@testing-library/react`
moved to v16, which supports both majors.
