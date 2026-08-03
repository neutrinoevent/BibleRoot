import type { ResourceLink } from "@/lib/resources";

interface Props {
  links: ResourceLink[];
  heading: string;
  blurb: string;
}

/** Deep links out to the standard scholarly tools, opened in a new tab. */
export function ResourceLinks({ links, heading, blurb }: Props) {
  if (links.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-lg">{heading}</h2>
      <p className="mt-1 text-sm text-ink-faint">{blurb}</p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full flex-col rounded-lg border border-rule bg-paper-raised px-4 py-3 transition-colors hover:border-rule-strong"
            >
              <span className="flex items-baseline gap-1.5 text-sm font-medium text-ink">
                {link.label}
                {link.custom && (
                  <span className="rounded-sm bg-highlight px-1 text-[10px] font-normal text-ink-soft">
                    yours
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-faint">↗</span>
              </span>
              {link.description && (
                <span className="mt-1 text-xs leading-snug text-ink-soft">{link.description}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
