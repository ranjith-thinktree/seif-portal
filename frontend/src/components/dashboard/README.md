# India Training Overview Card

## Overview

A comprehensive interactive map component that displays training statistics across Indian states. Replaces the "Recent Data Uploads" card in the Admin Dashboard.

## Features

### 1. **Interactive Map**

- Simplified India map with state-level visualization
- Color-coded states:
  - **Grey (#E5E7EB)**: No training data
  - **Yellow (#FEF3C7)**: Has training data
  - **Blue (#3B82F6)**: Currently selected state
- Click any state to view its statistics
- State code displayed on selected state

### 2. **Statistics Panel**

Shows 4 key metrics for selected state:

- **No. of centers**: Total training centers
- **Trainers**: Total trainers
- **Trainees**: Total trainees enrolled
- **Female Trainees**: Female trainees enrolled

Each metric has:

- Icon in circular container
- Label and formatted value
- Professional styling

### 3. **Year Filter**

- Calendar Year (CY) dropdown in top-right corner
- Shows last 5 years
- Automatically refetches data when year changes

### 4. **Responsive Design**

- Desktop: Side-by-side map (2/3 width) and stats panel (1/3 width)
- Mobile: Stacked layout with map on top, stats below
- Maintains readability across all screen sizes

## Component Structure

```
IndiaTrainingCard.jsx
├── IndiaMapSVG (Sub-component)
│   ├── State shapes with click handlers
│   ├── Dynamic coloring based on data
│   └── Selected state highlighting
├── StatItem (Sub-component)
│   ├── Icon container
│   └── Label + value display
└── Main Component
    ├── Year dropdown
    ├── Loading state
    ├── Map area
    ├── Stats panel
    └── Legend
```

## API Integration

### Current Implementation (Mock Data)

```javascript
// Mock data structure
const mockData = {
  OD: {
    name: "Odisha",
    centers: 12,
    trainers: 45,
    trainees: 1248,
    femaleTrainees: 342,
    hasData: true,
  },
  // ... other states
};
```

### TODO: Real API Endpoint

**Replace mock data with actual API call:**

```javascript
// Line ~195 in IndiaTrainingCard.jsx
const response = await fetch(`/api/dashboard/state-stats?year=${selectedYear}`);
const data = await response.json();
setStateStats(data.stateStats);
```

**Expected API Response:**

```json
{
  "stateStats": {
    "OD": {
      "name": "Odisha",
      "centers": 12,
      "trainers": 45,
      "trainees": 1248,
      "femaleTrainees": 342,
      "hasData": true
    },
    "KA": { ... },
    ...
  }
}
```

## Real-Time Updates (Optional)

### TODO: WebSocket/SSE Integration

**Uncomment and configure lines ~270-290:**

```javascript
useEffect(() => {
  const ws = new WebSocket("/api/dashboard/state-stats/stream");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const { stateCode, centers, trainers, trainees, femaleTrainees } = data;

    setStateStats((prev) => ({
      ...prev,
      [stateCode]: {
        ...prev[stateCode],
        centers,
        trainers,
        trainees,
        femaleTrainees,
        hasData: true,
      },
    }));
  };

  return () => ws.close();
}, []);
```

**Expected WebSocket Message Format:**

```json
{
  "stateCode": "OD",
  "centers": 13,
  "trainers": 47,
  "trainees": 1290,
  "femaleTrainees": 355
}
```

## Map Enhancement

### Current Map (Placeholder)

The current implementation uses placeholder rectangles for states. Each state is represented by a 30x30 rectangle positioned at approximate centroids.

### TODO: Add Detailed India Map

**Replace placeholder SVG with actual India map paths:**

1. **Option A: Use Topojson (Recommended)**

   ```bash
   npm install react-simple-maps
   ```

   Download India topojson from:

   - https://github.com/deldersveld/topojson
   - Search for "India" states topojson

   ```javascript
   import { ComposableMap, Geographies, Geography } from "react-simple-maps";

   const geoUrl = "/path/to/india-states.json";

   <ComposableMap projection="geoMercator">
     <Geographies geography={geoUrl}>
       {({ geographies }) =>
         geographies.map((geo) => (
           <Geography
             key={geo.rsmKey}
             geography={geo}
             fill={getStateColor(geo.properties.code)}
             stroke="#FFFFFF"
             onClick={() => onStateClick(geo.properties.code)}
           />
         ))
       }
     </Geographies>
   </ComposableMap>;
   ```

2. **Option B: Use SVG Paths**

   Find India SVG map paths and replace the placeholder map section (lines ~55-100) with:

   ```jsx
   <svg viewBox="0 0 500 450" className="w-full h-full">
     <path
       id="OD"
       d="M350,250 L370,260 L365,280 L345,275 Z"
       fill={getStateColor("OD")}
       stroke="#FFFFFF"
       strokeWidth="1"
       className="cursor-pointer transition-all hover:opacity-80"
       onClick={() => onStateClick("OD")}
     />
     {/* Add paths for all 29 states */}
   </svg>
   ```

### State Codes Reference

```javascript
const STATE_CODES = {
  JK: "Jammu & Kashmir",
  HP: "Himachal Pradesh",
  PB: "Punjab",
  HR: "Haryana",
  DL: "Delhi",
  RJ: "Rajasthan",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  MP: "Madhya Pradesh",
  GJ: "Gujarat",
  MH: "Maharashtra",
  CG: "Chhattisgarh",
  OD: "Odisha",
  WB: "West Bengal",
  JH: "Jharkhand",
  BR: "Bihar",
  AS: "Assam",
  ML: "Meghalaya",
  MN: "Manipur",
  NL: "Nagaland",
  TR: "Tripura",
  SK: "Sikkim",
  AP: "Andhra Pradesh",
  TG: "Telangana",
  KA: "Karnataka",
  KL: "Kerala",
  TN: "Tamil Nadu",
  GA: "Goa",
};
```

## Styling

### Colors

```css
/* Map Background */
bg-slate-50 (#F8FAFC)

/* State Colors */
No Data: #E5E7EB (grey)
Has Data: #FEF3C7 (yellow)
Selected: #3B82F6 (blue - brand accent)

/* Stats Panel */
Background: white (#FFFFFF)
Icons: bg-slate-100 with text-slate-600
Labels: text-slate-600
Values: text-slate-900 font-semibold
```

### Responsive Breakpoints

```javascript
// Desktop (lg:)
lg: col - span - 2; // Map: 2/3 width
lg: col - span - 1; // Stats: 1/3 width

// Mobile (default)
col - span - 1; // Full width stacked
```

## Usage in Dashboard

```javascript
// DashboardPage.jsx
import IndiaTrainingCard from "../../components/dashboard/IndiaTrainingCard";

// In AdminDashboard component:
<IndiaTrainingCard />;
```

## Dependencies

- **React** (18.x)
- **Heroicons** (for icons)
- **Tailwind CSS** (for styling)

### Optional Dependencies (for map enhancement):

- **react-simple-maps** (for topojson rendering)
- **d3-geo** (for map projections)

## State Management

```javascript
// Component State
const [selectedYear, setSelectedYear] = useState(currentYear);
const [selectedStateCode, setSelectedStateCode] = useState("OD");
const [stateStats, setStateStats] = useState({});
const [isLoading, setIsLoading] = useState(true);
```

## Performance Considerations

1. **Lazy Loading**: Consider code-splitting the map component
2. **Memoization**: Use `React.memo` for StatItem components
3. **Debouncing**: Debounce state selection for rapid clicks
4. **Caching**: Cache year data in React Query or similar

## Future Enhancements

- [ ] Add tooltips on state hover showing quick stats
- [ ] Add zoom and pan functionality to map
- [ ] Add export functionality for state data
- [ ] Add comparison view (multiple states side-by-side)
- [ ] Add historical trend charts for selected state
- [ ] Add filtering by region (North, South, East, West)
- [ ] Add animation when transitioning between states
- [ ] Add search functionality to quickly find states

## Testing

### Manual Testing Checklist

- [ ] Year dropdown changes data correctly
- [ ] Clicking states updates stats panel
- [ ] All states are clickable
- [ ] Loading state displays correctly
- [ ] Responsive layout works on mobile
- [ ] Colors match design system
- [ ] Icons display correctly
- [ ] Numbers format with commas (1,248)
- [ ] Legend displays accurately

### Unit Tests (TODO)

```javascript
// Test state selection
test("clicking state updates selected state", () => {
  // ...
});

// Test year filter
test("changing year refetches data", () => {
  // ...
});

// Test data display
test("displays correct stats for selected state", () => {
  // ...
});
```

## Troubleshooting

### Issue: States not clickable

**Solution**: Check z-index and pointer-events on SVG paths

### Issue: Colors not updating

**Solution**: Verify `getStateColor()` logic and state keys match

### Issue: Stats showing 0 for all metrics

**Solution**: Check API response format matches expected structure

### Issue: Year dropdown not working

**Solution**: Verify `selectedYear` state is properly bound to select value

### Issue: Linting errors about unused IconComponent

**Solution**: This is a false positive - the component IS used in JSX. Can be safely ignored or suppress with `// eslint-disable-line`

## Support

For questions or issues, contact the development team or refer to:

- Main project README
- Component source code comments
- API documentation

---

**Created**: December 2025  
**Last Updated**: December 2025  
**Maintainer**: SEIF Portal Development Team
