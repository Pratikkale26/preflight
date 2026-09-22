export function Nav({ cta = true }: { cta?: boolean }) {
  return (
    <nav className="nav">
      <div className="wrap inner">
        <a href="/">
          <img src="/logo.png" alt="Preflight" />
        </a>
        <span className="spacer" />
        <a className="link" href="/#how">
          How it works
        </a>
        <a className="link" href="/#proof">
          Correctness
        </a>
        <a className="link" href="https://github.com/Pratikkale26/preflight">
          GitHub
        </a>
        {cta && (
          <a className="btn btn-primary" href="/simulate">
            Open the simulator
          </a>
        )}
      </div>
    </nav>
  )
}
