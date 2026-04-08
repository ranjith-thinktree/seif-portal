import React from "react";

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

    // Fetch and parse the SimpleMaps SVG file
    fetch("/india-map.svg")
      .then((response) => response.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const paths = svgDoc.querySelectorAll('path[id^="IN"]');

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

  // Calculate centroids after paths are rendered
  React.useEffect(() => {
    if (svgPaths.length > 0 && svgRef.current) {
      const centroids = {};
      svgPaths.forEach((state) => {
        const pathElement = svgRef.current.querySelector(`#path-${state.code}`);
        if (pathElement) {
          try {
            const bbox = pathElement.getBBox();
            centroids[state.code] = {
              x: bbox.x + bbox.width / 2,
              y: bbox.y + bbox.height / 2,
            };
          } catch {
            // Fallback if getBBox fails
            centroids[state.code] = { x: 500, y: 500 };
          }
        }
      });
      setStateCentroids(centroids);
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
      {/* State paths with accurate geographical boundaries */}
      {svgPaths.map((state) => {
        const centroid = stateCentroids[state.code] || { x: 500, y: 500 };

        return (
          <g key={state.code}>
            <path
              id={`path-${state.code}`}
              d={state.path}
              fill={stateColors[state.code] || "#E7E7E7"}
              stroke="#4A4A4A"
              strokeWidth="0.5"
              onMouseEnter={() => handleMouseEnter(state.code)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(state.code)}
              style={{
                cursor: "pointer",
                transition: "fill 0.15s ease",
              }}
            >
              <title>{state.name}</title>
            </path>
            {/* State code label */}
            {stateCentroids[state.code] && (
              <text
                x={centroid.x}
                y={centroid.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="18"
                fontWeight="600"
                fill="#1F2937"
                pointerEvents="none"
                style={{
                  userSelect: "none",
                }}
              >
                {state.code}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default IndiaMap;
