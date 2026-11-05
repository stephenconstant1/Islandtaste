import React from "react";

export default function Breadcrumb({
  section,
  parent,
}: {
  section: string;
  parent?: { label: string; href: string };
}) {
  return (
    <nav className="section-breadcrumb wrap" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        {parent && <li><a href={parent.href}>{parent.label}</a></li>}
        <li aria-current="page">{section}</li>
      </ol>
    </nav>
  );
}
