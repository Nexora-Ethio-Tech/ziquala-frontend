import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../localization';
import statements from '../data/officialSchoolStatement.json';

// Amharic and Afaan Oromoo are the school's supplied text, verbatim.
// Render directly: translation lookup must not rewrite this official wording.
export const OfficialSchoolPurpose = () => {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const statement = statements[language];
  return (
    <section id="school-purpose" lang={language} className="mx-auto max-w-[90rem] scroll-mt-24 px-5 py-20 lg:px-10 md:py-28">
      <h2 className="max-w-5xl font-serif text-3xl leading-relaxed text-emerald-950 dark:text-white md:text-4xl">{statement.name}</h2>
      <div className="mt-12">
        <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{statement.objectivesHeading}</h3>
        <ul className="mt-6 list-disc space-y-6 pl-6 text-lg leading-9 text-slate-700 dark:text-slate-200">
          {statement.objectives.map(objective => <li key={objective} className="pl-2">{objective}</li>)}
        </ul>
      </div>
      <div className="mt-14 grid gap-12 border-t border-black/15 pt-12 dark:border-white/15 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300">{statement.visionHeading}</h3>
          <p className="mt-6 text-lg leading-9 text-slate-700 dark:text-slate-200">{statement.vision}</p>
        </div>
        <div>
          <h3 className="text-2xl font-black text-amber-700 dark:text-amber-400">{statement.missionHeading}</h3>
          <p className="mt-6 text-lg leading-9 text-slate-700 dark:text-slate-200">{statement.mission}</p>
        </div>
      </div>
    </section>
  );
};
