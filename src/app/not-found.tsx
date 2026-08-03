import { SearchBox } from "@/components/SearchBox";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-serif text-3xl">Not found</h1>
      <p className="mt-3 text-ink-soft">
        That reference doesn&apos;t resolve to a verse. Try another one.
      </p>
      <div className="mt-6">
        <SearchBox />
      </div>
    </div>
  );
}
