# Gauteng Creative Sector Supportive Infrastructure Map

An interactive data-driven map visualising the supportive infrastructure for the Cultural and Creative Industries (CCIs) in Gauteng, South Africa.  
The project highlights **government entities, associations, incubators, hubs, festivals, awards, residencies, and other initiatives** that create opportunities for creatives — from open calls and mentorship programmes to collections and partnerships.  

The map was developed by [INCCA](https://incca.org.za), drawing on research from the **2024 Inclusive Economies Programme**, a collaboration between the **Gauteng City-Region Observatory (GCRO)** and the **Gauteng Department of Economic Development (GDED)**.

---

## ✨ Features

- **Interactive Map** – Explore CCIs infrastructure across Gauteng’s districts and cities.  
- **Filter by Category & Domain** – Narrow results to specific kinds of infrastructure (festivals, hubs, residencies, etc.).  
- **Responsive Design** – Optimised for both desktop and mobile (including custom modals for details and lists).  
- **Multi-Category Entries** – Organisations that straddle categories (e.g. *Artist Studio + Non-Profit*) are represented with gradient dots.  
- **Nomadic Spaces** – Initiatives without a fixed location appear in the list view with a *“Nomadic / no fixed site”* badge.  
- **Details Panel** – Click dots or filter chips to view descriptions, links, and images of entries.  

---

## 🙌 Credits

### Concept & Research
- **INCCA (Independent Network for Contemporary Culture & Art)** — Project lead, data modelling, UX and implementation  
- Research insights drawn from the **Inclusive Economies Programme (2024)**, a collaboration between the **Gauteng City-Region Observatory (GCRO)** and the **Gauteng Department of Economic Development (GDED)**  

### Project Team
- **Research:** Sarah de Villiers (independent), Lara Koseff (INCCA), Londi Modiko (INCCA), Nape Senong (independent)
- **Project Direction & Editorial:** Lara Koseff (INCCA)  
- **Design & Development:** Lara Koseff (React + D3)  
- **Research Commissioners:** GCRO & GDED research teams
- **Research interviewees** participating organisations, individuals and entities across Gauteng  

---

## 🤝 Contributing

We welcome contributions that improve accuracy, add missing initiatives, or enhance UX. Please follow these guidelines so the dataset stays clean and the UI works reliably.

### 1. Ways to contribute
- Fix or update an entry (description, website, coordinates, categories/domains)  
- Add a new entry (ensure it fits the scope: supportive infrastructure for CCIs in Gauteng)  
- Improve UX/content (copy edits, accessibility, or component refinements)

### 2. Scope & inclusion criteria
Entries should be entities or initiatives that **support** CCIs, e.g.:  
- **Yes:** hubs, incubators, public programmes, networks, recurring awards, residencies, non-profits, tertiary/skills programmes tied to CCIs  
- **Sometimes:** museums, galleries, theatres, libraries, commercial venues or entities — *only when* they run supportive programmes, have innovative platforms, are a social enterprise or provides supportive infrastructure (e.g. residencies, open calls)  
- **No:** purely commercial venues or one-off events without clear sector support

### 3. Taxonomy (required)
- **Categories** and **Domains** must match existing site values (to keep filters working)  
- Browse `/data/dataset.js` and reuse values exactly  
- If a new Category/Domain feels essential, open an issue first for discussion  

> **Rule:** *Domains and Categories must be existing on the site.* New terms require maintainers’ approval before use.

### 4. Images 
- Place images in `/public/images/`  
- Use **lowercase filenames** (no spaces), e.g. `bagfactory.jpg`  
- Prefer ≤200KB optimised JPG/WEBP/PNG  
- Add `image` path in the entry: `"/images/yourfile.jpg"`  
- If no image is available, omit the field

### 5. Coordinates & “Nomadic”
- Use decimal degrees for `lat` and `lon`  
- If the initiative has **no fixed site**, set `nomadic: true` and omit `lat`/`lon`  
- Nomadic entries will show a *“Nomadic / no fixed site”* badge

### 6. Entry checklist
When adding or editing an object in `/data/dataset.js`, check:

- [ ] `id` is unique, kebab-case  
- [ ] `name` is correct and official  
- [ ] `category` uses existing site values (1–4 max)  
- [ ] `domain` uses existing site values  
- [ ] `lat`/`lon` present **or** null for nomadic entities 
- [ ] `website` is HTTPS and live  
- [ ] `description` is concise yet notes why this entity contributes to the creative industries eco-system in Gauteng Province
- [ ] `image` (optional) lives in `/public/images/` and is optimised  

### 7. Submitting entry

1. **Fork** the repo and create a branch: `feat/add-bag-factory-update`  
2. Make edits to `/data/dataset.js` and add images in `/public/images/`  
3. Commit with a clear message, e.g.: 
4. Open a **Pull Request** describing changes and linking to sources  

---

### 9. Style & quality

- Keep descriptions factual; avoid hype  
- Use Title Case for names; sentence case for descriptions  
- Avoid trailing spaces or inconsistent commas  
- Run lint/format scripts before submitting  

---

### 10. Requesting corrections

If you represent an organisation and need an edit:  
- Open an issue with the required changes, or  
- Submit a PR with an updated entry and approved image + caption  


## 🗂️ Data Structure

Data entries live in `/data/dataset.js`. Each entry follows this structure:

```js
{
  id: "bag-factory",
  name: "Bag Factory Artist Studios",
  category: ["Artist studio", "Non-profit"], // multiple allowed
  type: "Non-profit",
  domain: ["Visual arts"], // multiple allowed
  lat: -26.2304,      // omit for nomadic entries
  lon: 28.0123,       // omit for nomadic entries
  description: "Bag Factory Artist Studios is a non-profit contemporary art organisation and residency that supports artists with open calls, awards, and exchange opportunities...",
  website: "https://bagfactoryart.org.za",
  image: "/images/bagfactory.jpg",
}




