import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import s from "./GautengCreativeDashboard.module.css";
import cityLabelsDefault from "../data/cities";
import { createPortal } from "react-dom";
import closeIcon from "/close.svg";

const getCategory = (p) =>
  p?.category ??
  p?.Category ??
  p?.type ??
  p?.Type ??
  p?.group ??
  p?.Group ??
  null;

const getDomains = (p) => {
  const raw = p?.domain ?? p?.Domain ?? p?.domains ?? p?.Domains ?? null;

  if (!raw) return [];
  return Array.isArray(raw) ? raw : [String(raw)];
};

const getCategories = (p) => {
  const raw =
    p?.categories ?? p?.category ?? p?.Category ?? p?.group ?? p?.Group ?? null;

  if (!raw) return [];
  return Array.isArray(raw) ? raw : [String(raw)];
};

function jitterFromId(id, max = 6) {
  // FNV-1a-ish tiny hash
  let h = 2166136261 >>> 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const angle = (h % 360) * (Math.PI / 180);
  const r = (h % (max * 10)) / 10; // 0..max px
  return [Math.cos(angle) * r, Math.sin(angle) * r];
}

export default function GautengCreativeDashboard({
  topoUrl = "/gauteng_adm2.topo.json",
  points = [],
  leftTitle = "GAUTENG CREATIVE SECTOR\nSUPPORTIVE INFRASTRUCTURE",
  leftIntro = "Add 2–4 short sentences about what this map shows. Keep it concise and scannable.",
  categoryOrder,
  categoryColors,
  initialZoom = 1.5,
  cityLabels = cityLabelsDefault,
  dotRadius = 6,
  dotOpacity = 0.9,
}) {
  // ----- refs -----
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const mapRef = useRef(null);
  const wrapRef = useRef(null);

  // Detect hover capability (to disable hover on touch)
  const canHoverRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    const update = () => {
      canHoverRef.current = !!mq?.matches;
    };
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);

  // Legend filter
  const [activeCat, setActiveCat] = useState(null);
  // replace your existing toggleCategory
  const toggleCategory = (c) => {
    setFocused(null); // close any pinned card
    setActiveCat((prev) => (prev === c ? null : c));
  };

  const [activeDomains, setActiveDomains] = useState(new Set());
  // toggle helper
  const toggleDomain = (d) => {
    setActiveDomains((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };
  const clearDomains = () => setActiveDomains(new Set());

  // Modal state (mobile bottom sheet)
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Track viewport for mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Close helpers + Esc
  const closeModal = () => setIsModalOpen(false);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setActiveCat(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCat]);

  // Lock body scroll when modal opens
  useEffect(() => {
    if (!isModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen]);

  // If viewport grows past mobile while open, close the sheet
  useEffect(() => {
    if (!isMobile && isModalOpen) setIsModalOpen(false);
  }, [isMobile, isModalOpen]);

  // ----- initial zoom state -----
  const initialAppliedRef = useRef(false);
  const initialTransformRef = useRef(d3.zoomIdentity);

  // stable size: width from RO, height from the map element on real resizes only
  const [dims, setDims] = useState({ w: 1200, h: 720 });

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    const setHeightFromEl = () => {
      const rect = el.getBoundingClientRect();
      const h = Math.max(520, Math.round(rect.height || window.innerHeight));
      setDims((d) => (d.h === h ? d : { ...d, h }));
    };

    // width-only updates via RO (do NOT touch height here)
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(640, Math.round(entry.contentRect.width));
      setDims((d) => (Math.abs(w - d.w) <= TOL ? d : { ...d, w }));
    });
    ro.observe(el);

    // read height after first paint so layout is settled
    const raf = requestAnimationFrame(setHeightFromEl);

    // keep height synced on real viewport changes
    window.addEventListener("resize", setHeightFromEl);
    window.addEventListener("orientationchange", setHeightFromEl);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setHeightFromEl);
      window.removeEventListener("orientationchange", setHeightFromEl);
    };
  }, []);

  // ----- load & convert topology -----
  const [topology, setTopology] = useState(null);
  useEffect(() => {
    fetch(topoUrl)
      .then((r) => r.json())
      .then(setTopology);
  }, [topoUrl]);

  const objName = useMemo(
    () => (topology ? Object.keys(topology.objects)[0] : null),
    [topology]
  );
  const fc = useMemo(
    () =>
      topology && objName ? feature(topology, topology.objects[objName]) : null,
    [topology, objName]
  );
  const outline = useMemo(
    () =>
      topology && objName
        ? mesh(topology, topology.objects[objName], (a, b) => a === b)
        : null,
    [topology, objName]
  );
  const borders = useMemo(
    () =>
      topology && objName
        ? mesh(topology, topology.objects[objName], (a, b) => a !== b)
        : null,
    [topology, objName]
  );

  const catPoints = useMemo(() => {
    if (!activeCat) return [];
    return points
      .filter((p) => getCategories(p).includes(activeCat)) // <-- includes!
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCat, points]);

  // ----- projection & path -----
  const pad = 0;
  const projection = useMemo(() => {
    if (!fc) return null;
    return d3.geoMercator().fitExtent(
      [
        [pad, pad],
        [dims.w - pad, dims.h - pad],
      ],
      fc
    );
  }, [fc, dims]);
  const path = useMemo(
    () => (projection ? d3.geoPath(projection) : null),
    [projection]
  );

  // ----- zoom setup (dblclick → reset to initial transform) -----
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoomed = (e) => g.attr("transform", e.transform);
    const zoom = d3.zoom().scaleExtent([1, 12]).on("zoom", zoomed);

    svg.call(zoom);
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () =>
      svg
        .transition()
        .duration(400)
        .call(zoom.transform, initialTransformRef.current)
    );

    zoomRef.current = { zoom, svg };
    return () => {
      svg.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [path]);

  // ----- apply initial zoom once -----
  useEffect(() => {
    if (!path || !zoomRef.current || initialAppliedRef.current) return;
    const { svg, zoom } = zoomRef.current;

    const k = Math.max(1, Number(initialZoom) || 1);
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const t =
      k === 1
        ? d3.zoomIdentity
        : d3.zoomIdentity.translate(cx - k * cx, cy - k * cy).scale(k);

    svg.call(zoom.transform, t);
    initialTransformRef.current = t; // used by dblclick reset
    initialAppliedRef.current = true;
  }, [path, dims, initialZoom]);

  // ----- zoom to a clicked district -----
  const zoomToFeature = (f) => {
    if (!path || !zoomRef.current) return;
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const dx = x1 - x0,
      dy = y1 - y0;
    const scale = Math.min(12, 0.9 / Math.max(dx / dims.w, dy / dims.h));
    const tx = (dims.w - scale * (x0 + x1)) / 2;
    const ty = (dims.h - scale * (y0 + y1)) / 2;
    const { zoom, svg } = zoomRef.current;
    svg
      .transition()
      .duration(650)
      .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  // Mobile list modal
  const [isListOpen, setIsListOpen] = useState(false);

  // --- Legend drawer state/refs (MOBILE ONLY UI) ---
  const legendRef = useRef(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [legendOffset, setLegendOffset] = useState(0);
  // scratch values used during drag
  const dragRef = useRef({
    dragging: false,
    startY: 0,
    startOffset: 0,
    min: 0, // fully open (translateY = 0)
    max: 0, // fully hidden (translateY = maxHide)
    maxHide: 0, // computed from element height
  });

  // compute how far we can hide the drawer (leave the handle peeking)
  useEffect(() => {
    if (!isMobile) return; // only matters on mobile
    const el = legendRef.current;
    if (!el) return;

    // Ensure we have layout to measure after it’s in the DOM
    const handle = el.querySelector(`.${s.legendHandle}`);
    const handleH = handle ? handle.getBoundingClientRect().height : 36;

    const rect = el.getBoundingClientRect();
    const fullH = rect.height || 0;

    // how much to push the legend down to show only the handle
    const maxHide = Math.max(0, fullH - handleH);

    dragRef.current.maxHide = maxHide;
    dragRef.current.min = 0;
    dragRef.current.max = maxHide;

    // If it was open/closed before, keep that feel
    setLegendOffset(legendOpen ? 0 : maxHide);
  }, [isMobile, legendOpen]);

  // Drag handlers
  const onLegendDragStart = (clientY) => {
    if (!isMobile) return;
    dragRef.current.dragging = true;
    dragRef.current.startY = clientY;
    dragRef.current.startOffset = legendOffset;
  };

  const onLegendDragMove = (clientY) => {
    if (!isMobile || !dragRef.current.dragging) return;
    const dy = clientY - dragRef.current.startY;
    const next = Math.min(
      dragRef.current.max,
      Math.max(dragRef.current.min, dragRef.current.startOffset + dy)
    );
    setLegendOffset(next);
  };

  const onLegendDragEnd = () => {
    if (!isMobile) return;
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;

    // snap to open/closed depending on where we stopped (50% threshold)
    const snapClosed = legendOffset > dragRef.current.maxHide * 0.5;
    setLegendOpen(!snapClosed);
    setLegendOffset(snapClosed ? dragRef.current.maxHide : 0);
  };

  // "About" sheet state
  const [isAboutSheetOpen, setIsAboutSheetOpen] = useState(false);

  // Consolidated body-scroll lock for any open sheet
  useEffect(() => {
    const anyOpen = isModalOpen || isListOpen || isAboutSheetOpen;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isModalOpen, isListOpen, isAboutSheetOpen]);

  // Points that match current filters (category + domains)
  const filteredPoints = useMemo(() => {
    return points
      .filter((p) => {
        const passCat = !activeCat || getCategories(p).includes(activeCat);
        const pDomains = getDomains(p);
        const passDomain =
          activeDomains.size === 0 ||
          pDomains.some((d) => activeDomains.has(d));
        return passCat && passDomain;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [points, activeCat, activeDomains]);

  // Title + color for the list header
  const listTitle = activeCat
    ? `${activeCat} (${filteredPoints.length})`
    : activeDomains.size
    ? `Filtered (${filteredPoints.length})`
    : `All entries (${filteredPoints.length})`;

  // ----- categories & palette -----
  const categories = useMemo(() => {
    const all = points.flatMap(getCategories).filter(Boolean);
    const uniq = Array.from(new Set(all));
    if (categoryOrder?.length) {
      const order = new Set(categoryOrder);
      const extras = uniq.filter((c) => !order.has(c)).sort();
      return [...categoryOrder, ...extras];
    }
    return uniq.sort();
  }, [points, categoryOrder]);

  const domains = useMemo(() => {
    const all = points.flatMap(getDomains).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [points]);

  const palette = useMemo(() => {
    if (categoryColors) return categoryColors;
    const base = [
      ...d3.schemeTableau10,
      ...d3.schemeSet3,
      "#AAEFC5",
      "#FA2692",
      "#B8525C",
      "#ff7f50",
      "#4B6895",
      "#7F24B8",
      "#F171EC",
      "#F5D824",
    ];

    const m = {};
    categories.forEach((c, i) => {
      m[c] = base[i % base.length];
    });
    m["Uncategorised"] = m["Uncategorised"] || "#111";
    return m;
  }, [categories, categoryColors]);

  const listColor = useMemo(() => {
    if (activeCat) return palette[activeCat] || "#111";
    return "#111";
  }, [activeCat, palette]);

  const domainPoints = useMemo(() => {
    if (activeDomains.size === 0) return [];
    return points
      .filter((p) => {
        const pCats = getCategories(p);
        const passCat = !activeCat || pCats.includes(activeCat);

        const pDom = getDomains(p);
        const passDom =
          activeDomains.size === 0 || pDom.some((d) => activeDomains.has(d));

        return passCat && passDom;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [points, activeCat, activeDomains]);

  const dotStyleFor = (p) => {
    if (!p) return { "--cat-color": "#111" };
    const cats = getCategories(p);
    if (cats.length > 1) {
      const cols = cats.map((c) => palette[c] || "#111").join(", ");
      // gradient for multi-category
      return { backgroundImage: `linear-gradient(90deg, ${cols})` };
    }
    // single category (or fallback)
    const one = cats[0] ?? getCategory(p) ?? "Uncategorised";
    return { "--cat-color": palette[one] || "#111" };
  };

  // ----- hover & focus (sticky card) -----
  const [hover, setHover] = useState(null); // { x, y, p }
  const [focused, setFocused] = useState(null); // { p }

  // Throttle hover updates to the next animation frame
  const hoverRAF = useRef(0);
  const setHoverRAF = (val) => {
    if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current);
    hoverRAF.current = requestAnimationFrame(() => setHover(val));
  };
  // Clean up on unmount (and React strict-mode re-mount)
  useEffect(() => {
    return () => {
      if (hoverRAF.current) cancelAnimationFrame(hoverRAF.current);
    };
  }, []);

  if (!fc || !path) return <div style={{ padding: 16 }}>Loading…</div>;

  const info = focused ?? hover;
  const cat = info ? getCategory(info.p) ?? "Uncategorised" : null;
  const hasImage = Boolean(info?.p?.image);

  return (
    <div className={s.wrap} ref={wrapRef}>
      {/* LEFT PANEL */}
      <aside className={s.left}>
        <div className={s.leftHeader}>
          <h1 className={s.title}>{leftTitle}</h1>

          {isMobile && (
            <div
              className={s.aboutTopBtn}
              onClick={() => setIsAboutSheetOpen(true)}
              aria-label="About this map"
              title="About this map"
            >
              About
            </div>
          )}
        </div>
        <p className={s.intro}>{leftIntro}</p>
        <div
          className={`${s.card} ${!info ? s.cardEmpty : ""} ${
            hasImage ? s.cardHasImage : ""
          }`}
        >
          {focused ? (
            // --- existing SINGLE pinned card (unchanged) ---
            <>
              <div className={s.cardHeader}>
                <div className={s.cardDotandTitle}>
                  <span className={s.cardDot} style={dotStyleFor(focused.p)} />
                  <div className={s.cardTitle}>{focused.p.name}</div>
                </div>
                <div className={s.closeBtn} onClick={() => setFocused(null)}>
                  <img src={closeIcon} alt="Close" />
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.cardMeta}>
                  {focused.p.type ? `${focused.p.type} · ` : ""}
                  {getCategories(focused.p).length > 0
                    ? getCategories(focused.p).join(" · ")
                    : "Uncategorised"}
                </div>
                {focused.p.description && (
                  <p className={s.cardText}>{focused.p.description}</p>
                )}
                {focused.p.website && (
                  <a
                    className={s.cardLink}
                    href={focused.p.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit website →
                  </a>
                )}
                {focused.p.nomadic && (
                  <p className={s.cardText}>
                    <strong>{focused.p.nomadic}</strong>
                  </p>
                )}
                <button className={s.clearBtn} onClick={() => setFocused(null)}>
                  Clear pin
                </button>
              </div>

              {focused.p.image && (
                <div className={s.cardImage}>
                  <img src={focused.p.image} alt="" />
                </div>
              )}
            </>
          ) : activeCat ? (
            <>
              {/* List header */}
              <div className={s.cardHeader}>
                <div className={s.cardDotandTitle}>
                  <span
                    className={s.cardDot}
                    style={{ "--cat-color": palette[activeCat] || "#111" }}
                  />
                  <div className={s.cardTitle}>
                    {activeCat}{" "}
                    <span className={s.cardCount}>({catPoints.length})</span>
                  </div>
                </div>
                <div className={s.closeBtn} onClick={() => setActiveCat(null)}>
                  <img src={closeIcon} alt="Close" />
                </div>
              </div>

              {/* Scrollable list of mini cards */}
              <div className={`${s.cardBody} ${s.cardList}`}>
                {catPoints.map((p) => {
                  const color =
                    palette[getCategory(p) ?? "Uncategorised"] || "#111";
                  const isHot =
                    hover?.p?.id === p.id || focused?.p?.id === p.id;

                  // simple word-based truncation (≈ 22 words)
                  const desc = p.description
                    ? (() => {
                        const words = p.description.split(/\s+/);
                        return words.length > 22
                          ? words.slice(0, 22).join(" ") + "…"
                          : p.description;
                      })()
                    : null;

                  return (
                    <article
                      key={p.id}
                      className={`${s.miniCard} ${isHot ? s.miniCardHot : ""}`}
                      onMouseEnter={() => {
                        if (canHoverRef.current) {
                          const xy = projection([p.lon, p.lat]);
                          if (xy) setHoverRAF({ x: xy[0], y: xy[1], p });
                        }
                      }}
                      onMouseLeave={() =>
                        canHoverRef.current && setHoverRAF(null)
                      }
                    >
                      <header className={s.miniCardHead}>
                        <span className={s.miniDot} style={dotStyleFor(p)} />
                        <div
                          className={s.miniTitleBtn}
                          onClick={() => setFocused({ p })}
                          title="Pin this entry"
                        >
                          {p.name}
                        </div>
                      </header>

                      {desc && <p className={s.miniDesc}>{desc}</p>}
                      <footer className={s.miniFooter}>
                        {p.website && (
                          <a
                            className={s.miniLink}
                            href={p.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit website →
                          </a>
                        )}
                        {Number.isFinite(p.lon) && Number.isFinite(p.lat) ? (
                          <button
                            className={s.miniZoom}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            More
                          </button>
                        ) : (
                          <button
                            className={s.miniBadge}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            Nomadic / no fixed site
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            </>
          ) : domainPoints.length > 0 ? (
            <>
              {/* Header */}
              <div className={s.cardHeader}>
                <div className={s.cardDotandTitle}>
                  {/* Neutral dot (or pick a domain color system later) */}
                  <span
                    className={s.cardDot}
                    style={{ "--cat-color": "#f9f9f9" }}
                  />
                  <div className={s.cardTitle}>
                    {activeDomains.size === 1
                      ? `Domain: ${Array.from(activeDomains)[0]}`
                      : `Multiple Domains (${domainPoints.length})`}
                  </div>
                </div>
                <div className={s.closeBtn} onClick={clearDomains}>
                  <img src={closeIcon} alt="Close" />
                </div>
              </div>

              {/* Scrollable list of mini cards */}
              <div className={`${s.cardBody} ${s.cardList}`}>
                {domainPoints.map((p) => {
                  const isHot =
                    hover?.p?.id === p.id || focused?.p?.id === p.id;

                  // truncate like your category list
                  const desc = p.description
                    ? (() => {
                        const words = p.description.split(/\s+/);
                        return words.length > 22
                          ? words.slice(0, 22).join(" ") + "…"
                          : p.description;
                      })()
                    : null;

                  return (
                    <article
                      key={p.id}
                      className={`${s.miniCard} ${isHot ? s.miniCardHot : ""}`}
                      onMouseEnter={() => {
                        if (canHoverRef.current) {
                          const xy = projection([p.lon, p.lat]);
                          if (xy) setHoverRAF({ x: xy[0], y: xy[1], p });
                        }
                      }}
                      onMouseLeave={() =>
                        canHoverRef.current && setHoverRAF(null)
                      }
                    >
                      <header className={s.miniCardHead}>
                        {/* category-aware gradient dot */}
                        <span className={s.miniDot} style={dotStyleFor(p)} />
                        <div
                          className={s.miniTitleBtn}
                          onClick={() => setFocused({ p })}
                          title="Pin this entry"
                        >
                          {p.name}
                        </div>
                      </header>

                      {desc && <p className={s.miniDesc}>{desc}</p>}

                      <footer className={s.miniFooter}>
                        {p.website && (
                          <a
                            className={s.miniLink}
                            href={p.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit website →
                          </a>
                        )}
                        {Number.isFinite(p.lon) && Number.isFinite(p.lat) ? (
                          <button
                            className={s.miniZoom}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            More
                          </button>
                        ) : (
                          <button
                            className={s.miniBadge}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            Nomadic / no fixed site
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            </>
          ) : hover ? (
            // — HOVER PREVIEW
            <>
              <div className={s.cardHeader}>
                <div className={s.cardDotandTitle}>
                  <span className={s.cardDot} style={dotStyleFor(hover.p)} />
                  <div className={s.cardTitle}>{hover.p.name}</div>
                </div>
              </div>

              <div className={s.cardBody}>
                <div className={s.cardMeta}>
                  {hover.p.type ? `${hover.p.type} · ` : ""}
                  {getCategories(hover.p).length > 0
                    ? getCategories(hover.p).join(" · ")
                    : "Uncategorised"}
                </div>
                {hover.p.description && (
                  <p className={s.cardText}>{hover.p.description}</p>
                )}
                {hover.p.website && (
                  <a
                    className={s.cardLink}
                    href={hover.p.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit website →
                  </a>
                )}
              </div>

              {hover.p.image && (
                <div className={s.cardImage}>
                  <img src={hover.p.image} alt="" />
                </div>
              )}
            </>
          ) : (
            // — EMPTY —
            <>
              <div className={s.cardEmptyHint}>
                Hover a dot on the map to preview a venue or entity here. Click
                a dot to pin details.
              </div>
              <div className={s.cardBody} />
            </>
          )}
        </div>
      </aside>

      {/* MAP */}
      <div className={s.map} ref={mapRef}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          className={s.svgBlock}
          role="img"
          aria-label="Gauteng supportive infrastructure map"
        >
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          <g ref={gRef}>
            <g fill="#eef3fb">
              {fc.features.map((f, i) => (
                <path
                  key={i}
                  d={path(f)}
                  onClick={() => zoomToFeature(f)}
                  cursor="pointer"
                />
              ))}
            </g>

            <path
              d={path(outline)}
              fill="none"
              stroke="#111"
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={path(borders)}
              fill="none"
              stroke="#6b7280"
              strokeWidth={1}
              strokeLinejoin="round"
              strokeLinecap="round"
              shapeRendering="geometricPrecision"
              vectorEffect="non-scaling-stroke"
            />

            {points.map((p) => {
              if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat))
                return null;
              let [x, y] = projection([p.lon, p.lat]) || [null, null];
              if (x == null) return null;

              const [jx, jy] = jitterFromId(p.id, 5);
              x += jx + (p.dx || 0);
              y += jy + (p.dy || 0);

              const pCats = getCategories(p);
              const colors = pCats.map((c) => palette[c] || "#111");
              const hasMulti = colors.length > 1;
              const gradId = `grad-${p.id}`;
              const fill = hasMulti ? `url(#${gradId})` : colors[0];

              const passCat = !activeCat || pCats.includes(activeCat);
              const pDomains = getDomains(p);
              const hasDomainFilter = activeDomains.size > 0;
              const passDomain =
                !hasDomainFilter || pDomains.some((d) => activeDomains.has(d));
              const visible = passCat && passDomain;

              const dimmed = !visible;
              const r = visible ? dotRadius : Math.max(2, dotRadius * 0.2);
              const isHot = hover?.p?.id === p.id || focused?.p?.id === p.id;

              return (
                <g
                  key={p.id}
                  className={`${s.pointGroup} ${dimmed ? s.pointDim : ""}`}
                  transform={`translate(${x},${y})`}
                  onMouseEnter={() =>
                    canHoverRef.current && setHoverRAF({ x, y, p })
                  }
                  onMouseLeave={() => canHoverRef.current && setHoverRAF(null)}
                  onClick={() => {
                    setFocused({ p });
                    if (isMobile) setIsModalOpen(true);
                  }}
                >
                  {/* per-point gradient only if needed */}
                  {hasMulti && (
                    <defs>
                      <linearGradient
                        id={gradId}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        {colors.map((col, i) => {
                          const stop = (i / (colors.length - 1)) * 100;
                          return (
                            <stop key={i} offset={`${stop}%`} stopColor={col} />
                          );
                        })}
                      </linearGradient>
                    </defs>
                  )}

                  {isHot && <circle className={s.pointHalo} r={r + 1} />}
                  <circle
                    className={s.point}
                    r={r}
                    filter="url(#shadow)"
                    style={{ fill }} // 👈 inline fill always wins
                    fillOpacity={dotOpacity}
                  />
                  <circle
                    className={s.pointHit}
                    r={Math.max(12, dotRadius * 1)}
                  />
                </g>
              );
            })}

            {/* city labels */}
            <g className={s.cityLayer}>
              {cityLabels.map((c) => {
                if (!Number.isFinite(c.lon) || !Number.isFinite(c.lat))
                  return null;
                const xy = projection([c.lon, c.lat]);
                if (!xy) return null;
                const [x, y] = xy;
                return (
                  <g key={c.id} transform={`translate(${x},${y})`}>
                    <circle className={s.cityDot} r={1.8} />
                    <text className={s.cityText} x={5} y={3}>
                      {c.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
        <div className={s.hint}>
          Click a district to zoom • Double-click to reset
        </div>

        {isMobile && (
          <button
            className={s.fab}
            onClick={() => setIsListOpen(true)}
            aria-label="Open list"
            title="Open list"
          >
            {activeCat
              ? `View ${activeCat}`
              : activeDomains.size
              ? "View filtered"
              : "Browse list"}
          </button>
        )}
      </div>

      {/* LEGEND */}
      {isMobile ? (
        // --- Mobile: draggable bottom drawer ---
        <aside
          ref={legendRef}
          className={`${s.legend} ${s.legendDrawer}`}
          style={{ transform: `translateY(${legendOffset}px)` }}
          onMouseMove={(e) => onLegendDragMove(e.clientY)}
          onMouseUp={onLegendDragEnd}
          onMouseLeave={onLegendDragEnd}
          onTouchMove={(e) => onLegendDragMove(e.touches[0].clientY)}
          onTouchEnd={onLegendDragEnd}
        >
          {/* handle / grip area */}
          <div
            className={s.legendHandle}
            role="button"
            aria-label={legendOpen ? "Collapse legend" : "Expand legend"}
            onMouseDown={(e) => onLegendDragStart(e.clientY)}
            onTouchStart={(e) => onLegendDragStart(e.touches[0].clientY)}
            onClick={() => {
              // tap toggles
              const closing = legendOffset === 0;
              const peek = dragRef.current.maxHide;
              setLegendOpen(!closing);
              setLegendOffset(closing ? peek : 0);
            }}
          >
            <div className={s.legendGrip} />
            <div className={s.legendHandleLabel}>Key</div>
          </div>

          {/* the actual legend content */}
          <div className={s.legendInner} aria-label="Category key">
            <div className={s.legendTitleRow}>
              <div className={s.legendTitle}>Key</div>
              <div className={s.legendTitleNote}>Data category</div>
            </div>

            {activeCat && (
              <button
                className={s.legendClear}
                onClick={() => setActiveCat(null)}
              >
                Show all
              </button>
            )}

            <div className={s.legendList}>
              {categories.map((c) => {
                const isActive = activeCat === c;
                const isDim = activeCat && !isActive;
                return (
                  <div
                    key={c}
                    className={`${s.legendRow} ${
                      isActive ? s.legendRowActive : ""
                    } ${isDim ? s.legendRowDim : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    onClick={() => toggleCategory(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCategory(c);
                      }
                    }}
                    title={isActive ? "Click to show all" : `Highlight: ${c}`}
                  >
                    <span
                      className={s.legendSwatch}
                      style={{ "--cat-color": palette[c] }}
                    />
                    <div className={s.legendCategory}>{c}</div>
                  </div>
                );
              })}
            </div>

            {/* Domains */}
            {domains.length > 0 && (
              <>
                <div className={s.legendTitleRow} style={{ marginTop: 12 }}>
                  <div className={s.legendTitle}>Domains</div>
                  <div className={s.legendTitleNote}>
                    Filter by domain or sector
                  </div>
                </div>

                {activeDomains.size > 0 && (
                  <button className={s.legendClear} onClick={clearDomains}>
                    Clear domains
                  </button>
                )}

                <div className={s.domainList}>
                  {domains.map((d) => {
                    const on = activeDomains.has(d);
                    return (
                      <button
                        key={d}
                        className={`${s.domainChip} ${
                          on ? s.domainChipOn : ""
                        }`}
                        onClick={() => toggleDomain(d)}
                        aria-pressed={on}
                        title={on ? "Remove filter" : `Filter: ${d}`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>
      ) : (
        // --- Desktop: original static legend ---
        <aside className={s.legend} aria-label="Category key">
          <div className={s.legendTitleRow}>
            <div className={s.legendTitle}>Key</div>
            <div className={s.legendTitleNote}>Data category</div>
          </div>

          {activeCat && (
            <button
              className={s.legendClear}
              onClick={() => setActiveCat(null)}
            >
              Show all
            </button>
          )}

          <div className={s.legendList}>
            {categories.map((c) => {
              const isActive = activeCat === c;
              const isDim = activeCat && !isActive;
              return (
                <div
                  key={c}
                  className={`${s.legendRow} ${
                    isActive ? s.legendRowActive : ""
                  } ${isDim ? s.legendRowDim : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => toggleCategory(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleCategory(c);
                    }
                  }}
                  title={isActive ? "Click to show all" : `Highlight: ${c}`}
                >
                  <span
                    className={s.legendSwatch}
                    style={{ "--cat-color": palette[c] }}
                  />
                  <div className={s.legendCategory}>{c}</div>
                </div>
              );
            })}

            {/* If you already render a FAB in the map, you can delete this block */}
            {isMobile && (
              <button
                className={s.fab}
                onClick={() => setIsListOpen(true)}
                aria-label="Open list"
                title="Open list"
              >
                {activeCat
                  ? `View ${activeCat}`
                  : activeDomains.size
                  ? "View filtered"
                  : "Browse list"}
              </button>
            )}
          </div>

          {/* Domains */}
          {domains.length > 0 && (
            <>
              <div className={s.legendTitleRow} style={{ marginTop: 12 }}>
                <div className={s.legendTitle}>Domains</div>
                <div className={s.legendTitleNote}>
                  Filter by domain or sector
                </div>
              </div>

              {activeDomains.size > 0 && (
                <button className={s.legendClear} onClick={clearDomains}>
                  Clear domains
                </button>
              )}

              <div className={s.domainList}>
                {domains.map((d) => {
                  const on = activeDomains.has(d);
                  return (
                    <button
                      key={d}
                      className={`${s.domainChip} ${on ? s.domainChipOn : ""}`}
                      onClick={() => toggleDomain(d)}
                      aria-pressed={on}
                      title={on ? "Remove filter" : `Filter: ${d}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      )}

      {/* MOBILE SHEET */}
      {isMobile &&
        isModalOpen &&
        focused &&
        createPortal(
          <div className={s.modalBackdrop} onClick={closeModal}>
            <div
              className={s.modalSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="venue-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={s.modalHandle} aria-hidden />

              {/* reuse your card content */}
              <div className={s.cardHeader}>
                <span className={s.cardDot} style={dotStyleFor(focused?.p)} />
                <div id="venue-title" className={s.cardTitle}>
                  {focused.p.name}
                </div>
                <button
                  className={s.modalClose}
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <img src={closeIcon} alt="Close" />
                </button>
              </div>

              <div className={s.cardBody}>
                <div className={s.cardMeta}>
                  {focused.p.type ? `${focused.p.type} · ` : ""}
                  {getCategories(focused.p).length > 0
                    ? getCategories(focused.p).join(" · ")
                    : "Uncategorised"}
                </div>
                {focused.p.description && (
                  <p className={s.cardText}>{focused.p.description}</p>
                )}
                {focused.p.website && (
                  <a
                    className={s.cardLink}
                    href={focused.p.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit website →
                  </a>
                )}
                {focused.p.nomadic && (
                  <p className={s.cardText}>
                    <strong>{focused.p.nomadic}</strong>
                  </p>
                )}
                <button
                  className={s.clearBtn}
                  onClick={() => {
                    setFocused(null);
                    closeModal();
                  }}
                >
                  Clear selection
                </button>
              </div>

              {focused.p.image && (
                <div className={s.cardImage}>
                  <img src={focused.p.image} alt="" />
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {isMobile &&
        isListOpen &&
        createPortal(
          <div className={s.modalBackdrop} onClick={() => setIsListOpen(false)}>
            <div
              className={s.modalSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="list-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={s.modalHandle} aria-hidden />

              {/* Header */}
              <div className={s.cardHeader}>
                <span
                  className={s.cardDot}
                  style={{ "--cat-color": listColor }}
                />

                <div id="list-title" className={s.cardTitle}>
                  {listTitle}
                </div>
                <button
                  className={s.modalClose}
                  onClick={() => setIsListOpen(false)}
                  aria-label="Close"
                >
                  <img src={closeIcon} alt="Close" />
                </button>
              </div>

              {/* List body */}
              <div className={`${s.cardBody} ${s.cardList}`}>
                {filteredPoints.map((p) => {
                  const isHot =
                    hover?.p?.id === p.id || focused?.p?.id === p.id;
                  const desc = p.description
                    ? (() => {
                        const words = p.description.split(/\s+/);
                        return words.length > 22
                          ? words.slice(0, 22).join(" ") + "…"
                          : p.description;
                      })()
                    : null;

                  return (
                    <article
                      key={p.id}
                      className={`${s.miniCard} ${isHot ? s.miniCardHot : ""}`}
                      onMouseEnter={() => {
                        if (
                          canHoverRef.current &&
                          Number.isFinite(p.lon) &&
                          Number.isFinite(p.lat)
                        ) {
                          const xy = projection([p.lon, p.lat]);
                          if (xy) setHoverRAF({ x: xy[0], y: xy[1], p });
                        }
                      }}
                      onMouseLeave={() =>
                        canHoverRef.current && setHoverRAF(null)
                      }
                    >
                      <header className={s.miniCardHead}>
                        <span className={s.miniDot} style={dotStyleFor(p)} />
                        <div
                          className={s.miniTitleBtn}
                          onClick={() => {
                            setFocused({ p });
                            setIsListOpen(false);
                            setIsModalOpen(true); // open the venue sheet
                          }}
                          title="Open details"
                        >
                          {p.name}
                        </div>
                      </header>
                      {desc && <p className={s.miniDesc}>{desc}</p>}
                      <footer className={s.miniFooter}>
                        {p.website && (
                          <a
                            className={s.miniLink}
                            href={p.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit website →
                          </a>
                        )}
                        {Number.isFinite(p.lon) && Number.isFinite(p.lat) ? (
                          <button
                            className={s.miniZoom}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            More
                          </button>
                        ) : (
                          <button
                            className={s.miniBadge}
                            onClick={() => {
                              setFocused({ p });
                              setIsListOpen(false);
                              setIsModalOpen(true);
                            }}
                            title="Open details"
                          >
                            Nomadic / no fixed site
                          </button>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
      {isMobile &&
        isAboutSheetOpen &&
        createPortal(
          <div
            className={s.modalBackdrop}
            onClick={() => setIsAboutSheetOpen(false)}
          >
            <div
              className={s.topSheet}
              role="dialog"
              aria-modal="true"
              aria-labelledby="about-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={s.topSheetHeader}>
                <h1 className={s.title}>{leftTitle}</h1>
                <button
                  className={s.modalClose}
                  onClick={() => setIsAboutSheetOpen(false)}
                  aria-label="Close"
                >
                  <img src={closeIcon} alt="Close" />
                </button>
              </div>

              <div className={s.topSheetBody}>
                <p className={s.introSheet}>{leftIntro}</p>
              </div>
              <p className={s.mobilemessage}>
                Click a dot on the map for more info or explore Data categories
                or Domain filters in the Key.
              </p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
