export default function AppHeader({ title, subtitle, actionLabel = "", actionHref = "#" }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {actionLabel ? (
        <a className="btn btn-primary" href={actionHref}>
          {actionLabel}
        </a>
      ) : null}
    </header>
  );
}
