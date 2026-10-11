// The X and GitHub marks stay the official shapes and a single ink color.
// The pill is the doodle; the logos are not.

const X_URL = 'https://x.com/mittalparth_'
const REPO_URL = 'https://github.com/mittal-parth/experiments'

export function FollowCorner() {
  return (
    <aside className="follow" data-testid="follow">
      <div className="follow-pill">
        <svg className="follow-pill-edge" viewBox="0 0 78 36" aria-hidden="true">
          <path
            d="M17 4.2h44c8.2.5 13.4 4.6 13.2 13.4-.2 8.6-5.2 13.6-13.4 14H17C8.2 31.2 3.2 26.4 3.4 17.8 3.6 9 8.8 4.6 17 4.2z"
            fill="#fff6ea"
            stroke="#241c16"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
        <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="mittalparth_ on X">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </svg>
        </a>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Song Guesser on GitHub">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </div>
    </aside>
  )
}
