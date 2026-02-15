# Grid

Purpose
- Define an integer-grid world coordinate model.
- Render a toggleable infinite-looking debug grid (bright pink).
- Provide snap/quantization rules for placement.

Initial constraints
- Coordinates are integers only.
- Footprints are >= 1x1.
- Footprint width/height must be whole numbers.
- No float-sized placement footprints.

Planned artifacts
- Grid state component/resource
- Grid render pass or stage
- Grid utility functions (`worldToGrid`, `gridToWorld`, `snapToGrid`)
- Occupancy checks for placement
