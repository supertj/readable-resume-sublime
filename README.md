# ReadableResume Snippets

Sublime Text snippets for two one-page resume templates from <a href="https://readableresume.com/">ReadableResume</a>:

- [atsresume](https://ctan.org/pkg/atsresume), a LaTeX class on CTAN
- [readable-classic](https://typst.app/universe/package/readable-classic), a Typst package on Typst Universe

Both set the same layout: your name centered at the top, section headings in capitals over a thin rule, places and dates on the right margin. Everything sits in one column, so the text in the PDF comes out in reading order, which is what an applicant tracking system needs to parse it.

If you'd rather write in LibreOffice Writer, the same layout is on the LibreOffice templates site as the [Classic](https://extensions.libreoffice.org/en/extensions/show/99679) and [Plain](https://extensions.libreoffice.org/en/extensions/show/99699) ATS-friendly resume templates, a [Student resume template](https://extensions.libreoffice.org/en/extensions/show/99701) that puts education first, and [plain and student cover letters](https://extensions.libreoffice.org/en/extensions/show/99702).

Each snippet uses the commands and argument names the template defines. `ats-resume` and `rc-resume` insert a complete file; the others go inside one.

## Before you start

**LaTeX.** The snippets work in files that use the LaTeX syntax that comes with Sublime Text. atsresume is in TeX Live. If your TeX installation is older than the class, download `atsresume.cls` from CTAN and put it next to your `.tex` file.

**Typst.** Install the Typst package from Package Control. It gives `.typ` files the syntax these snippets are scoped to. Typst downloads the readable-classic package the first time you compile.

## Use

Type a trigger, for example `ats-experience`, and press Tab. Tab then moves to the next field. To pick from a list instead, press Ctrl+Space, or type `Snippet:` in the Command Palette.

For a new resume, start from an empty file with `ats-resume` or `rc-resume`.

The paper size defaults to US Letter. For A4, type `a4paper` (LaTeX) or `a4` (Typst) over the default.

## LaTeX snippets (atsresume)

| Trigger | Inserts |
|---|---|
| `ats-resume` | A whole resume: class, header, Experience, Education and Skills |
| `ats-class` | `\documentclass[letterpaper]{atsresume}` |
| `ats-margin` | `\geometry{margin=0.75in}`, for margins other than the default |
| `ats-header` | `\name` and four `\contact` lines. They go in the preamble, and `\makeheader` prints them |
| `ats-contact` | One `\contact` item |
| `ats-email` | `\contact{\email{...}}`, an email address as a link |
| `ats-weblink` | `\contact{\weblink{...}}`, a web address as a link |
| `ats-summary` | A Summary section with a paragraph |
| `ats-experience` | `\experience{Company}{Place}{Job title}{Dates}` and a bullet list |
| `ats-education` | `\education{School}{Place}{Degree}{Dates}` and a bullet list |
| `ats-activity` | `\activity{Name}{Role}{Dates}` and a bullet list, for clubs, volunteering or certifications |
| `ats-project` | The same `\activity` entry, filled in for a project |
| `ats-skills` | A Skills section with two `\skill` lines |
| `ats-skill` | One `\skill{Label}{Text}` line |
| `ats-bullets` | An `itemize` list with two points |
| `ats-date` | A date range with an en dash: `Jun 2024 – Present` |

## Typst snippets (readable-classic)

| Trigger | Inserts |
|---|---|
| `rc-resume` | A whole resume: import, setup, Experience, Education and Skills |
| `rc-import` | `#import "@preview/readable-classic:0.1.0": *` |
| `rc-setup` | `#show: resume.with(...)` with your name, contact line and paper size |
| `rc-page` | The `paper`, `margin`, `font` and `font-size` arguments of `resume`, set to their defaults |
| `rc-contact` | The `contact` argument. Emails and web addresses in it become links |
| `rc-summary` | A Summary heading with a paragraph |
| `rc-experience` | `#experience` with company, location, title, date and bullets |
| `rc-education` | `#education` with school, location, degree, date and bullets |
| `rc-activity` | `#activity` with name, role, date and bullets, for clubs and volunteering |
| `rc-project` | The same `#activity` entry, filled in for a project |
| `rc-skills` | A Skills heading and `#skills((...))` with two lines |
| `rc-skill` | One more `"Label": "Text"` line for `#skills` |
| `rc-date` | `date: "Jun 2024 – Present"` |

Skill labels are written as strings, so a label with a space, like `"Soft skills"`, works too.

In Typst, `$` starts math. Write `\$25,000` in a bullet.

## Install

With Package Control, run **Package Control: Install Package** and pick `ReadableResume Snippets`.

To install by hand, open **Preferences > Browse Packages...** and clone this repository into that folder:

```sh
git clone https://github.com/supertj/readable-resume-sublime "ReadableResume Snippets"
```

## License

MIT. The templates have their own licenses: atsresume is under the LaTeX Project Public License 1.3c, readable-classic under MIT.
