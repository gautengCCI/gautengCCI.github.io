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

## 🗂️ Data Structure

Data entries live in `/data/dataset.js`. Each entry follows this structure:

```js
{
  id: "bag-factory",
  name: "Bag Factory Artist Studios",
  category: ["Artist studio", "Non-profit"], // multiple allowed
  type: "Non-profit",
  domain: ["Visual arts"],
  lat: -26.2304,      // omit for nomadic entries
  lon: 28.0123,       // omit for nomadic entries
  description: "Bag Factory Artist Studios is a non-profit contemporary art organisation and residency that supports artists with open calls, awards, and exchange opportunities.",
  website: "https://bagfactoryart.org.za",
  image: "https://vansa.co.za/wp-content/uploads/2018/03/Bag_Factory_exterior.jpg",
  nomadic: false
}
