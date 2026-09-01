/**
 * Jira REST client.
 *
 * Prefers API **v2** wherever it still exists: it returns descriptions as plain
 * strings, where v3 returns Atlassian Document Format. Cloud has removed some
 * v2 endpoints, so `resolveSearch` falls through to v3 when it must — map.mjs
 * copes with either shape.
 *
 * Auth is Basic with an API token (Cloud) or a personal access token (Server).
 * Nothing here is Zetoo-specific, so it stays free of database access.
 */

const USER_AGENT = 'Zetoo-Import/1.0'

export class JiraError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'JiraError'
    this.status = status
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const createClient = ({ baseUrl, email, token, fetchImpl = fetch }) => {
  const root = String(baseUrl).replace(/\/+$/, '')
  const auth = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64')

  /**
   * One request, with retries.
   *
   * Jira rate-limits hard on large migrations and answers 429 with
   * `Retry-After`. Honouring it is the difference between an import that
   * finishes and one that dies at issue 3000.
   */
  const request = async (path, { attempt = 0, ...init } = {}) => {
    const response = await fetchImpl(`${root}${path}`, {
      ...init,
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })

    if (response.status === 429 || response.status >= 500) {
      if (attempt >= 4) {
        throw new JiraError(`Jira antwortet dauerhaft mit ${response.status}.`, response.status)
      }
      const retryAfter = Number(response.headers.get('retry-after'))
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000
      await sleep(wait)
      return request(path, { ...init, attempt: attempt + 1 })
    }

    if (response.status === 401 || response.status === 403) {
      throw new JiraError(
        'Jira lehnt die Zugangsdaten ab. E-Mail und API-Token prüfen, und ob das Konto das Projekt sehen darf.',
        response.status,
      )
    }

    if (!response.ok) {
      // `soft` lets a caller probe an endpoint that may not exist on this
      // instance without turning the miss into a failed import.
      if (init.soft && (response.status === 404 || response.status === 410)) return null
      const body = await response.text().catch(() => '')
      throw new JiraError(
        `Jira ${response.status} auf ${path}${body ? `: ${body.slice(0, 200)}` : ''}`,
        response.status,
      )
    }

    return response.json()
  }

  /**
   * Jira's issue search has moved twice.
   *
   * Cloud removed the offset-paged `/rest/api/2/search` and replaced it with
   * `search/jql`, which pages by opaque token and reports no total. Server and
   * Data Center still only have the old one. Rather than guess which instance
   * we are talking to, each candidate is tried once and the winner remembered.
   *
   * v2 is preferred over v3 wherever it exists: v2 returns descriptions as
   * plain strings, v3 as Atlassian Document Format.
   */
  const SEARCH_CANDIDATES = [
    { path: '/rest/api/2/search/jql', paging: 'token' },
    { path: '/rest/api/3/search/jql', paging: 'token' },
    { path: '/rest/api/2/search', paging: 'offset' },
  ]

  let search = null

  const resolveSearch = async (jql, fields) => {
    if (search) return search
    for (const candidate of SEARCH_CANDIDATES) {
      const query =
        candidate.paging === 'token'
          ? `?jql=${encodeURIComponent(jql)}&maxResults=1&fields=${encodeURIComponent(fields)}`
          : `?jql=${encodeURIComponent(jql)}&startAt=0&maxResults=1&fields=${encodeURIComponent(fields)}`
      const probe = await request(candidate.path + query, { soft: true })
      if (probe) {
        search = candidate
        return search
      }
    }
    throw new JiraError('Keiner der bekannten Such-Endpunkte von Jira hat geantwortet.')
  }

  return {
    /** Who the token belongs to — the cheapest way to verify a connection. */
    me: () => request('/rest/api/2/myself'),

    /** Field catalogue, used to locate story points and the sprint field. */
    fields: () => request('/rest/api/2/field'),

    projects: async () => {
      // Cloud paginates this; Server returns a plain array.
      const first = await request('/rest/api/2/project/search?maxResults=50')
      if (Array.isArray(first)) return first

      const all = [...(first.values ?? [])]
      let startAt = all.length
      while (!first.isLast && all.length < (first.total ?? 0)) {
        const page = await request(`/rest/api/2/project/search?maxResults=50&startAt=${startAt}`)
        const values = page.values ?? []
        if (!values.length) break
        all.push(...values)
        startAt += values.length
      }
      return all
    },

    statuses: (projectKey) => request(`/rest/api/2/project/${encodeURIComponent(projectKey)}/statuses`),

    /**
     * Roughly how many issues a query matches.
     *
     * The token-paged endpoint reports no total, so a progress bar needs this
     * separate call. It is approximate by design and simply absent on older
     * instances, hence the soft request.
     */
    async approximateCount(jql) {
      for (const version of [2, 3]) {
        const body = await request(`/rest/api/${version}/search/approximate-count`, {
          method: 'POST',
          body: JSON.stringify({ jql }),
          soft: true,
        })
        if (body && typeof body.count === 'number') return body.count
      }
      return 0
    },

    /**
     * Every issue matching a JQL query, page by page.
     *
     * An async generator rather than one big array: a migration can run to
     * tens of thousands of issues, and the caller should be able to write each
     * page away instead of holding the lot in memory.
     */
    async *searchIssues(jql, { fields = 'summary', pageSize = 100 } = {}) {
      const endpoint = await resolveSearch(jql, fields)
      let cursor = endpoint.paging === 'token' ? null : 0
      let seen = 0

      for (;;) {
        const query =
          endpoint.paging === 'token'
            ? `?jql=${encodeURIComponent(jql)}&maxResults=${pageSize}` +
              `&fields=${encodeURIComponent(fields)}` +
              (cursor ? `&nextPageToken=${encodeURIComponent(cursor)}` : '')
            : `?jql=${encodeURIComponent(jql)}&startAt=${cursor}&maxResults=${pageSize}` +
              `&fields=${encodeURIComponent(fields)}`

        const page = await request(endpoint.path + query)
        const issues = page.issues ?? []
        if (!issues.length) return

        seen += issues.length
        yield { issues, total: page.total ?? 0, seen }

        if (endpoint.paging === 'token') {
          // No token left means that was the last page.
          if (!page.nextPageToken || page.isLast) return
          cursor = page.nextPageToken
        } else {
          cursor += issues.length
          if (cursor >= (page.total ?? 0)) return
        }
      }
    },

    /** Worklogs hang off the issue, not off the search result. */
    worklogs: async (issueIdOrKey) => {
      const page = await request(
        `/rest/api/2/issue/${encodeURIComponent(issueIdOrKey)}/worklog?maxResults=1000`,
      )
      return page.worklogs ?? []
    },

    /** Agile boards belonging to a project, needed to reach its sprints. */
    boards: async (projectKeyOrId) => {
      const page = await request(
        `/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKeyOrId)}&maxResults=50`,
      )
      return page.values ?? []
    },

    sprints: async (boardId) => {
      const all = []
      let startAt = 0
      for (;;) {
        const page = await request(
          `/rest/agile/1.0/board/${boardId}/sprint?startAt=${startAt}&maxResults=50`,
        )
        const values = page.values ?? []
        all.push(...values)
        if (page.isLast || !values.length) return all
        startAt += values.length
      }
    },
  }
}
