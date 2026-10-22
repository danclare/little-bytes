import Link from "next/link";

export default function FoodSafetySourcesPage() {
  return (
    <main className="content">
      <section className="card">
        <p className="eyebrow">Food-safety guidance</p>
        <h1>Reliable sources, little steps</h1>
        <p>
          Little Bites provides general food information and organisation tools. It does not
          diagnose allergies, provide medical advice or create a personalised nutrition plan. Check
          current guidance, food labels and your child&apos;s care plan.
        </p>
        <p>
          Speak with a GP or health visitor about diagnosed allergies, eczema, family allergy
          history, feeding or swallowing concerns, poor growth or other medical needs. Severe
          allergic symptoms are an emergency; call 999.
        </p>
        <h2>Official NHS guidance</h2>
        <ul className="list">
          <li className="list-item">
            <a
              href="https://www.nhs.uk/best-start-in-life/baby/weaning/"
              target="_blank"
              rel="noreferrer"
            >
              NHS Best Start in Life: Weaning
            </a>
            <p className="muted">Starting solid foods, readiness and introducing a varied diet.</p>
          </li>
          <li className="list-item">
            <a
              href="https://www.nhs.uk/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/"
              target="_blank"
              rel="noreferrer"
            >
              NHS: Foods to avoid giving babies and young children
            </a>
            <p className="muted">
              Age-specific cautions including honey, whole nuts, salt and egg handling.
            </p>
          </li>
          <li className="list-item">
            <a
              href="https://www.nhs.uk/baby/weaning-and-feeding/food-allergies-in-babies-and-young-children/"
              target="_blank"
              rel="noreferrer"
            >
              NHS: Food allergies in babies and young children
            </a>
            <p className="muted">
              Introducing allergenic foods, when to seek advice and emergency symptoms.
            </p>
          </li>
        </ul>
        <p className="muted">
          Source links were checked during the rebuild. Guidance may change; these NHS pages are the
          source of truth. Catalogue notes are not a substitute for professional advice.
        </p>
        <Link className="button button-secondary" href="/">
          Back to Little Bites
        </Link>
      </section>
    </main>
  );
}
