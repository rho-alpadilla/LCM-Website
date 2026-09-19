import {
  PageIntro,
  PublicPage,
} from "@/frontend/components/public/public-page";

const coreValues = [
  ["L", "Life changing family worship"],
  ["I", "Intentional discipleship"],
  ["F", "Fulfilling aggressive witnessing"],
  ["E", "Extreme passion for Jesus Christ"],
  ["T", "Truthful and loving relationship"],
  ["E", "Encouragement in prayers and in presence"],
  ["A", "Accountability to one another"],
  ["M", "Maturity and obedience in the Lord"],
] as const;

export default function AboutPage() {
  return (
    <PublicPage>
      <PageIntro
        description="Lifechangers Ministry Incorporated exists to love God, love people, and make disciples who transform their homes, campuses, barangays, and nations."
        eyebrow="Who we are"
        title="About Lifechangers Ministry"
      />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold tracking-[0.2em] text-green-700 uppercase">
              Vision
            </p>
            <p className="mt-4 text-2xl leading-9 font-black text-slate-950">
              To see a multitude of Christ’s Lifechangers among campuses and
              barangays through the Family Cell Groups—transforming lives,
              families and nations.
            </p>
          </article>
          <article className="rounded-3xl bg-blue-900 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
              Mission
            </p>
            <p className="mt-4 text-2xl leading-9 font-black">
              To win souls and make disciples.
            </p>
            <p className="mt-5 leading-7 text-blue-100">
              Matthew 28:19–20 calls us to make disciples of all nations,
              baptize them, and teach them to obey everything Jesus commanded.
            </p>
          </article>
        </section>

        <section
          className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8"
          aria-labelledby="goal-title"
        >
          <p className="text-sm font-bold tracking-[0.2em] text-red-700 uppercase">
            Goal
          </p>
          <h2
            className="mt-3 text-3xl font-black text-slate-950"
            id="goal-title"
          >
            Agents of change at every level
          </h2>
          <ul className="mt-6 grid gap-4 leading-7 text-slate-700 sm:grid-cols-2">
            <li className="rounded-2xl bg-white p-4">
              Every believer, an agent of change.
            </li>
            <li className="rounded-2xl bg-white p-4">
              Every agent of change, a spiritual leader.
            </li>
            <li className="rounded-2xl bg-white p-4">
              Every home of a spiritual leader, a center for family worship.
            </li>
            <li className="rounded-2xl bg-white p-4">
              For every university and barangay, a ministry center.
            </li>
          </ul>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <article className="rounded-3xl bg-yellow-300 p-6 text-slate-950 sm:p-8">
            <p className="text-sm font-bold tracking-[0.2em] uppercase">
              Passion
            </p>
            <p className="mt-4 text-3xl leading-10 font-black">
              To love God and to love people.
            </p>
          </article>
          <article
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
            aria-labelledby="values-title"
          >
            <p className="text-sm font-bold tracking-[0.2em] text-green-700 uppercase">
              Core values
            </p>
            <h2
              className="mt-3 text-3xl font-black text-slate-950"
              id="values-title"
            >
              LIFETEAM
            </h2>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {coreValues.map(([letter, value], index) => (
                <div
                  className="flex gap-3 rounded-xl bg-slate-50 p-3"
                  key={`${letter}-${index}`}
                >
                  <dt className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-900 font-black text-yellow-300">
                    {letter}
                  </dt>
                  <dd className="pt-1 text-sm leading-5 text-slate-700">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </section>

        <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-slate-200 sm:p-8">
          <p className="text-sm font-bold tracking-[0.2em] text-yellow-300 uppercase">
            Ministry verse
          </p>
          <blockquote className="mt-4 max-w-4xl text-xl leading-8 font-bold text-white">
            “Every day they continued to meet together in the temple courts.
            They broke bread in their homes and ate together with glad and
            sincere hearts, praising God and enjoying the favor of all the
            people. And the Lord added to their number daily those who were
            being saved.”
          </blockquote>
          <p className="mt-4 font-bold text-slate-300">Acts 2:46–47</p>
        </section>
      </div>
    </PublicPage>
  );
}
