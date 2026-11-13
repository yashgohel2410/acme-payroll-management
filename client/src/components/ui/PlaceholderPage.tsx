type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="page">
      <p className="page__eyebrow">Placeholder</p>
      <h1>{title}</h1>
      <p className="page__description">{description}</p>
    </section>
  )
}
