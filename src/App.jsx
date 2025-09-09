import "./App.css";
import GautengCreativeDashboard from "./components/GautengCreativeDashboard";
import points from "./data/dataset";

// 1) Exact category → color mapping (keys must match your dataset strings)
const catColors = {
  "Industry associations or networks": "#AAEFC5",
  "Collective management organisations (CMO)": "#FB7185",
  "Incubators or creative hubs": "#ffc6ff",
  "Cultural and natural heritage sites": "#B8525C",
  "Private initiatives": "#f95738",
  "Maker Spaces": "#4B6895",
  "4IR": "#7F24B8",
  "Libraries": "#f4d35e",
  "Public-private partnerships": "#072ac8",
  "Artist studios": "#EEFA3B",
  "Theatres": "#C2B8FA",
  "Government": "#0EA5A5",
  "Government SEZs": "#10B981",
  "Academic partnerships": "#3B82F6",
  "International organisations": "#6366F1",
  "Corporate collections": "#F59E0B",
  "Commercial galleries": "#EC4899",
  "Non-profits": "#22C55E",
  "Festivals": "#ef233c",
  "Conferences": "#8B5CF6",
  "Trade Fairs / Markets": "#14B8A6",
  "Book Fairs": "#f5cac3",
  "Art Fairs": "#3a5a40",
  "Artist Residencies": "#97802D",
  "Project spaces": "#b9fbc0",
  "Museums / Galleries": "#1c1341",
};

// 2) Legend order (optional, but nice to keep things consistent)
const catOrder = Object.keys(catColors);

export default function App() {
  const isMobile = window.innerWidth <= 1024;

  return (
    <div className="page">
      <main className="pageMain">
        <div>
          <GautengCreativeDashboard
            topoUrl="/gauteng_adm2.topo.json"
            points={points}
            leftTitle={"Gauteng Creative Sector\nSupportive Infrastructure"}
            leftIntro={
              <>
                Developed by{" "}
                <a
                  href="https://incca.org.za/Overview-Study-for-the-Creative-Industries-Sector-in-Gauteng"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  INCCA (Independent Network for Contemporary Culture & Art)
                </a>
                , this interactive map draws on research from the 2024 Inclusive
                Economies Programme, a collaboration between the Gauteng
                City-Region Observatory (GCRO) and the Gauteng Department of
                Economic Development. It visualises key mechanisms that support
                the creative industries sector Gauteng, South Africa’s most
                populous and economically vibrant province — from government
                entities, associations, incubators, and hubs to galleries,
                academic partnerships, and private initiatives. While not
                exhaustive, it highlights selected examples where innovative
                infrastructure and programming, based on our research, appear to
                be strengthening the Cultural and Creative Industries.
              </>
            }
            categoryColors={catColors}
            categoryOrder={[
              // Events first (split)
              "Festivals",
              "Conferences",
              "Trade Fairs / Markets",
              "Book Fairs",
              "Art Fairs",
              // Organisations / infra
              "Government",
              "Government SEZs",
              "Public-private partnerships",
              "Industry associations or networks",
              "Collective management organisations (CMO)",
              "Incubators or creative hubs",
              "Academic partnerships",
              "International organisations",
              "Non-profits",
              "Private initiatives",
              // Places / spaces
              "Commercial galleries",
              "Corporate collections",
              "Artist studios",
              "Maker Spaces",
              "4IR",
              "Libraries",
              "Theatres",
              "Cultural and natural heritage sites",
              "Artist Residencies",
              "Project spaces",
              "Museums / Galleries",
            ]}
            dotRadius={4}
            dotOpacity={0.9}
            initialZoom={isMobile ? 2.2 : 1.5}
          />
        </div>
      </main>

      <footer className="pageFooter">
        © {new Date().getFullYear()} Independent Network for Contemporary
        Culture & Art ·{" "}
        <a href="https://incca.org.za/Overview-Study-for-the-Creative-Industries-Sector-in-Gauteng">
          About
        </a>
      </footer>
    </div>
  );
}
