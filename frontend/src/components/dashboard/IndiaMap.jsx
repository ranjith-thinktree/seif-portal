import React from "react";

// Manual label position overrides for small UTs / islands.
const LABEL_OVERRIDES = {
  PY: { x: 417.7, y: 838.9 }, // Puducherry centroid from the source map
  DN: { x: 120, y: 680 }, // Daman & Diu - position near Gujarat coast
  LD: { x: 160, y: 860 }, // Lakshadweep
  AN: { x: 900, y: 760 }, // Andaman & Nicobar Islands
};

const CITY_MARKERS = [
  { name: "Hyderabad", x: 397, y: 658, labelX: 455, labelY: 672 },
  { name: "Bengaluru", x: 333, y: 776, labelX: 285, labelY: 790 },
  { name: "Chennai", x: 405, y: 823, labelX: 450, labelY: 815 },
  { name: "Puducherry", x: 418, y: 839, labelX: 475, labelY: 850 },
];

// Keep labels readable in the crowded north-east while the connector remains
// anchored to the actual state centroid.
const LABEL_OFFSETS = {
  SK: { x: 22, y: -18 },
  AS: { x: 28, y: -4 },
  ML: { x: -28, y: -14 },
  MN: { x: 24, y: 4 },
  NL: { x: 30, y: -10 },
  TR: { x: -24, y: 16 },
  MZ: { x: 24, y: 18 },
  AR: { x: 24, y: -16 },
  CH: { x: -18, y: -16 },
  DL: { x: 18, y: 12 },
  GA: { x: -18, y: 16 },
  PY: { x: 24, y: 10 },
  TG: { x: -34, y: -22 },
};

/**
 * India Map SVG Component with accurate state boundaries
 * Uses SimpleMaps data for precise geographical representation
 */
const IndiaMap = ({
  stateColors,
  onStateHover,
  onStateLeave,
  onStateClick,
}) => {
  const handleMouseEnter = (stateCode) => {
    if (onStateHover) {
      onStateHover(stateCode);
    }
  };

  const handleMouseLeave = () => {
    if (onStateLeave) {
      onStateLeave();
    }
  };

  const handleClick = (stateCode) => {
    if (onStateClick) {
      onStateClick(stateCode);
    }
  };

  const [svgPaths, setSvgPaths] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [stateCentroids, setStateCentroids] = React.useState({});
  const [smallPathCodes, setSmallPathCodes] = React.useState(new Set());
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    // Mapping from SimpleMaps codes (INXX) to our 2-letter codes
    const simpleMapToOurCode = {
      INAN: "AN", // Andaman and Nicobar
      INAP: "AP", // Andhra Pradesh
      INAR: "AR", // Arunachal Pradesh
      INAS: "AS", // Assam
      INBR: "BR", // Bihar
      INCH: "CH", // Chandigarh
      INCT: "CG", // Chhattisgarh
      INDH: "DN", // Dadra and Nagar Haveli and Daman and Diu
      INDL: "DL", // Delhi
      INGA: "GA", // Goa
      INGJ: "GJ", // Gujarat
      INHR: "HR", // Haryana
      INHP: "HP", // Himachal Pradesh
      INJH: "JH", // Jharkhand
      INJK: "JK", // Jammu and Kashmir
      INKA: "KA", // Karnataka
      INKL: "KL", // Kerala
      INLA: "LA", // Ladakh
      INLD: "LD", // Lakshadweep
      INMH: "MH", // Maharashtra
      INML: "ML", // Meghalaya
      INMN: "MN", // Manipur
      INMP: "MP", // Madhya Pradesh
      INMZ: "MZ", // Mizoram
      INNL: "NL", // Nagaland
      INOR: "OD", // Odisha (Orissa)
      INPB: "PB", // Punjab
      INPY: "PY", // Puducherry
      INRJ: "RJ", // Rajasthan
      INSK: "SK", // Sikkim
      INTG: "TG", // Telangana
      INTN: "TN", // Tamil Nadu
      INTR: "TR", // Tripura
      INUP: "UP", // Uttar Pradesh
      INUT: "UK", // Uttarakhand (Uttaranchal)
      INWB: "WB", // West Bengal
    };

    // Threshold (bbox area) below which a path is considered a tiny symbol/artifact
    const SMALL_PATH_AREA_THRESHOLD = 25;

    // Fetch and parse the SimpleMaps SVG file
    fetch("/india-map.svg")
      .then((response) => response.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const paths = svgDoc.querySelectorAll('path[id^="IN"]');

        // Also read any circle markers embedded in the original SVG (these often
        // contain reliable centroid coordinates: cx/cy). Use them when available
        // to position labels/markers accurately (fixes small enclaves like PY).
        const circleNodes = svgDoc.querySelectorAll('circle[id^="IN"]');
        const circleMap = Array.from(circleNodes).reduce((acc, c) => {
          const id = c.getAttribute("id");
          const cx = parseFloat(c.getAttribute("cx"));
          const cy = parseFloat(c.getAttribute("cy"));
          if (!Number.isNaN(cx) && !Number.isNaN(cy)) acc[id] = { x: cx, y: cy };
          return acc;
        }, {});

        const stateData = Array.from(paths)
          .map((path) => {
            const simpleMapCode = path.getAttribute("id");
            const ourCode = simpleMapToOurCode[simpleMapCode];
            const name = path.getAttribute("name");
            const pathData = path.getAttribute("d");

            return {
              code: ourCode,
              name: name,
              path: pathData,
              simpleMapCode: simpleMapCode,
              // Prefer circle centroid if available for this state (cx/cy)
              centroid: circleMap[simpleMapCode] || null,
            };
          })
          .filter((state) => state.code); // Filter out any unmapped states

        setSvgPaths(stateData);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading India map SVG:", error);
        setLoading(false);
      });
  }, []);

  // Calculate centroids after paths are rendered and detect tiny artifact paths
  React.useEffect(() => {
    if (svgPaths.length > 0 && svgRef.current) {
      const centroids = {};
      const tinyCodes = new Set();

      svgPaths.forEach((state) => {
        // Respect manual overrides for tiny states / UTs first
        if (LABEL_OVERRIDES[state.code]) {
          centroids[state.code] = {
            x: LABEL_OVERRIDES[state.code].x,
            y: LABEL_OVERRIDES[state.code].y,
          };
          return;
        }

        const pathElement = svgRef.current.querySelector(`#path-${state.code}`);
        if (pathElement) {
          try {
            const bbox = pathElement.getBBox();
            const area = bbox.width * bbox.height;

            // If path is tiny, treat it as a symbol/artifact — prefer circle centroid
            if (area < SMALL_PATH_AREA_THRESHOLD) {
              tinyCodes.add(state.code);

              if (state.centroid) {
                centroids[state.code] = {
                  x: state.centroid.x,
                  y: state.centroid.y,
                };
              } else {
                // Use bbox center as fallback for tiny shapes but do not rely on it
                centroids[state.code] = {
                  x: bbox.x + bbox.width / 2,
                  y: bbox.y + bbox.height / 2,
                };
              }
            } else {
              // Normal polygon — prefer circle centroid when available
              if (state.centroid) {
                centroids[state.code] = {
                  x: state.centroid.x,
                  y: state.centroid.y,
                };
              } else {
                centroids[state.code] = {
                  x: bbox.x + bbox.width / 2,
                  y: bbox.y + bbox.height / 2,
                };
              }
            }
          } catch (e) {
            // Fallback if getBBox fails
            centroids[state.code] = state.centroid || { x: 500, y: 500 };
          }
        } else {
          // No path element — use circle centroid or fallback
          centroids[state.code] = state.centroid || { x: 500, y: 500 };
        }
      });

      setStateCentroids(centroids);
      setSmallPathCodes(tinyCodes);
    }
  }, [svgPaths]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Loading map...
      </div>
    );
  }

  if (svgPaths.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Error loading map
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 1000"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* State paths with accurate geographical boundaries (drawn first) */}
      <g id="states">
        {svgPaths.map((state) => {
          const isTiny = smallPathCodes.has(state.code);

          return (
            <g key={state.code}>
              <path
                id={`path-${state.code}`}
                d={state.path}
                fill={isTiny ? "transparent" : stateColors[state.code] || "#E7E7E7"}
                stroke="#4A4A4A"
                strokeWidth="0.5"
                onMouseEnter={() => handleMouseEnter(state.code)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(state.code)}
                style={{
                  cursor: "pointer",
                  transition: "fill 0.15s ease",
                  display: isTiny ? "none" : "inline",
                }}
              >
                <title>{state.name}</title>
              </path>
            </g>
          );
        })}
      </g>

      {/* Labels rendered on top of all paths to avoid being hidden */}
      <g id="state-labels" pointerEvents="none">
        {svgPaths.map((state) => {
          const centroid =
            stateCentroids[state.code] ||
            LABEL_OVERRIDES[state.code] ||
            { x: 500, y: 500 };
          const offset = LABEL_OFFSETS[state.code] || { x: 0, y: 0 };
          const labelPosition = {
            x: centroid.x + offset.x,
            y: centroid.y + offset.y,
          };

          return (
            <g key={`label-${state.code}`}>
              {offset.x !== 0 || offset.y !== 0 ? (
                <line
                  x1={centroid.x}
                  y1={centroid.y}
                  x2={labelPosition.x}
                  y2={labelPosition.y}
                  stroke="#4B5563"
                  strokeWidth="1.5"
                  pointerEvents="none"
                />
              ) : null}
              <circle
                cx={centroid.x}
                cy={centroid.y}
                r="3"
                fill="#111827"
                pointerEvents="none"
              />
              <text
                x={labelPosition.x}
                y={labelPosition.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                fontWeight="700"
                fill="#111827"
                stroke="#FFFFFF"
                strokeWidth="4"
                paintOrder="stroke"
                pointerEvents="none"
                style={{
                  userSelect: "none",
                }}
              >
                {state.code}
              </text>
            </g>
          );
        })}
      </g>

      <g id="city-markers" pointerEvents="none">
        {CITY_MARKERS.map((city) => (
          <g key={city.name}>
            <line
              x1={city.x}
              y1={city.y}
              x2={city.labelX}
              y2={city.labelY}
              stroke="#DC2626"
              strokeWidth="1.5"
            />
            <circle
              cx={city.x}
              cy={city.y}
              r="5"
              fill="#DC2626"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <text
              x={city.labelX}
              y={city.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="15"
              fontWeight="700"
              fill="#991B1B"
              stroke="#FFFFFF"
              strokeWidth="5"
              paintOrder="stroke"
            >
              {city.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default IndiaMap;
