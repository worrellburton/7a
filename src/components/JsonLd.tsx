// Shared <JsonLd> renderer. Drops a single <script
// type="application/ld+json"> tag with the provided schema object
// serialised. Accepts either a single schema or an array — multiple
// schemas render as multiple script tags so each one validates
// independently in Google's Rich Results Test.
//
// Use with the builders in src/lib/seo/schema.ts:
//   <JsonLd data={buildOrganizationSchema()} />
//   <JsonLd data={[buildBreadcrumbSchema(crumbs), buildFAQSchema(faq)]} />
//
// Renders nothing visible — only emits the script tag. Safe to use
// inside <head> via Next.js metadata.icons workaround OR inline in
// the page body (search engines pick it up either way).

import React from 'react';

type SchemaShape = Record<string, unknown>;

export function JsonLd({ data }: { data: SchemaShape | SchemaShape[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
