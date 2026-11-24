import { Link, useParams } from "react-router";
import { GraduationCap } from "lucide-react";
import { PageHeading } from "@/ui/components/PageHeading";
import { Button } from "@/ui/components/ui/button";
import { Eyebrow, Page } from "@/components/Chrome";
import { LoadError, Loading, NotFound } from "@/components/LoadState";
import { TopicRing } from "@/components/TopicRing";
import { ContentNotFound, loadProgram, useLoaded } from "@/content/load";
import { TheoryPicture } from "@/ui/pictures/TheoryPicture";
import type { Program, ProgramSection, ProgramTopic } from "@/content/types";
import { t } from "@/strings";

/** A program's page: its ring of topics, then the topics as a numbered path. A topic opens to show the points it covers. */
export function ProgramScreen() {
  const { slug = "" } = useParams();
  const program = useLoaded(`program:${slug}`, () => loadProgram(slug));
  // The heading comes with the program: the key changes when it has loaded, so focus moves to it then.
  return (
    <Page focusKey={`program:${slug}:${program.loading ? "loading" : "shown"}`} busy={program.loading}>
      {program.loading && <Loading />}
      {program.error && (program.error instanceof ContentNotFound ? <NotFound /> : <LoadError onRetry={program.retry} />)}
      {program.data && <ProgramOutline program={program.data} />}
    </Page>
  );
}

function ProgramOutline({ program }: { program: Program }) {
  const grades = t.grades(program.grades);
  return (
    <section className="course-shell">
      <div className="course-hero">
        <div className="course-heading">
          <Eyebrow>{t.programEyebrow}</Eyebrow>
          <PageHeading>{program.title}</PageHeading>
          {program.description && <p className="course-description">{program.description}</p>}
          {grades && (
            <span className="catalog-card-meta">
              <span className="catalog-card-item">
                <GraduationCap aria-hidden="true" />
                {grades}
              </span>
            </span>
          )}
        </div>
        <span className="course-hero-art">
          <TopicRing topics={program.topics.length} large />
        </span>
      </div>
      <div className="course-next is-plan">
        <span className="course-next-text">
          <span className="course-next-title">{t.programNoLessons}</span>
          <span className="course-next-line">{t.programPlanText}</span>
        </span>
        <Button asChild variant="outline" className="secondary">
          <Link to="/courses" id="program-to-courses">
            {t.landingAll}
          </Link>
        </Button>
      </div>
      <section className="module">
        <h2 className="module-heading">{t.programTopics}</h2>
        <ol className="lesson-list">
          {program.topics.map((topic, i) => (
            <TopicRow key={topic.slug} number={i + 1} topic={topic} section={program.sections.find((s) => s.slug === topic.section)} />
          ))}
        </ol>
      </section>
    </section>
  );
}

/**
 * A planned topic: a dashed row that opens when it has points to show. Its
 * section is told by a drawing before the title and named under it.
 */
function TopicRow({ number, topic, section }: { number: number; topic: ProgramTopic; section?: ProgramSection }) {
  const name = (
    <>
      {section?.picture && <TheoryPicture name={section.picture} size={40} className="topic-picture" />}
      <span className="topic-name">
        <span className="topic-title">{topic.title}</span>
        {section && <span className="topic-section">{section.title}</span>}
      </span>
    </>
  );
  return (
    <li className="lesson-item topic-item is-planned" data-topic={topic.slug}>
      <span className="lesson-step" aria-hidden="true">
        {number}
      </span>
      {topic.covers.length ? (
        <details className="topic">
          <summary>{name}</summary>
          <ul className="topic-covers">
            {topic.covers.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </details>
      ) : (
        <div className="topic">{name}</div>
      )}
    </li>
  );
}
