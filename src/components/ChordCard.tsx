/**
 * Fingering Diagram Component
 * 
 * Displays a visual representation of the INNATO flute's fingering system:
 * - 6 holes arranged in a perfect circle
 * - Center circle showing chord number
 * - 3 arms (Y-shape) with note labels
 * 
 * All proportions are scale-independent and will remain consistent at any size.
 * Geometry is defined in viewBox coordinates (120x120).
 */

import { getNotesFromOpenStates, type FluteType } from '../lib/fluteData';

type Hole = { cx: number; cy: number; open: boolean };

interface ChordCardProps {
	root?: string; // e.g., G4 - note at top arm (auto-calculated if openStates provided)
	bottomLeft?: string; // e.g., Bb3 - note at left bottom arm (auto-calculated if openStates provided)
	bottomRight?: string; // e.g., C4 - note at right bottom arm (auto-calculated if openStates provided)
	value?: string; // center number text (chord ID)
	holes?: Hole[]; // Pre-computed hole positions (optional)
	openStates?: boolean[]; // length 6, true=open, order: [rightUpper, rightLower, leftLower, leftUpper, frontLeft, frontRight]
	fluteType?: FluteType; // Flute tuning (default: Cm4)
	hideNotes?: boolean; // If true, don't show note labels even if calculated
	hideChordNumber?: boolean; // If true, don't show chord number in center
	showLabels?: boolean; // If true, show finger labels and chamber labels (default: false)
	
	// Optional: override default proportions (all relative to viewBox)
	ringRadius?: number; // radius for the 6-hole ring
	ringRotationDeg?: number; // rotation of the ring, degrees clockwise
	holeRadius?: number; // individual hole circle radius
	centerRadius?: number; // center number circle radius
	armRx?: number; // arm thickness
	armRy?: number; // arm length
	fluid?: boolean; // render larger/flexible card
	pixelSize?: number; // explicit svg pixel size for fluid mode
	
	// Interaction callbacks
	onClick?: () => void;
	onPlay?: (notes: { left: string; right: string; front: string }) => void;
}

// ============================================================================
// Geometry Constants - All in viewBox coordinates (120x120)
// 
// IMPORTANT: All proportions are scale-independent. The viewBox system ensures
// that regardless of the actual pixel size, all relationships remain constant:
// - Ring radius, hole radius, center radius, arm dimensions are all relative
// - Using preserveAspectRatio="xMidYMid meet" scales everything proportionally
// - Text uses SVG units which scale automatically with the viewBox
// 
// To change scale: Modify the container size or use fluid mode with pixelSize.
// All internal proportions will remain identical.
// ============================================================================

const VIEWBOX_SIZE = 140; // Increased from 120 to fit all labels
const CENTER_X = VIEWBOX_SIZE / 2;
const CENTER_Y = VIEWBOX_SIZE / 2;

// Core geometry - proportions remain constant at any scale
// All values are percentages of VIEWBOX_SIZE:
const DEFAULT_RING_RADIUS = 34.5;    // 28.75% of viewBox - radius of 6-hole ring
const DEFAULT_RING_ROTATION_DEG = 90; // Rotation so top pair is perfectly horizontal
const DEFAULT_HOLE_RADIUS = 9;        // 7.5% of viewBox - individual hole radius
const DEFAULT_CENTER_RADIUS = 15;     // 12.5% of viewBox - center circle radius
const DEFAULT_ARM_THICKNESS = 3;      // 2.5% of viewBox - arm oval thickness
const DEFAULT_ARM_LENGTH = 40;        // 33.3% of viewBox - arm length from center

// Arm configuration: Y-shape with one up, two diagonal down
const ARM_ANGLES = [-90, 30, 150] as const; // up, down-right, down-left

// Label positioning - all relative to viewBox (scale automatically)
const LABEL_DISTANCE_FROM_ARM_END = 8;  // 6.67% of viewBox - text offset from arm end
const LABEL_VERTICAL_SHIFT = 5;          // 4.17% of viewBox - base vertical adjustment
const LABEL_TOP_VERTICAL_SHIFT = -3;    // -2.5% of viewBox - extra upward shift for top label
const CHAMBER_LABEL_DISTANCE_FROM_ARM_END = 16; // Distance from arm end for chamber labels

// Finger label positioning - distance from hole edge
const FINGER_LABEL_DISTANCE = 18;        // Distance from hole edge to finger label

// Center text positioning - using relative em units (scales with font size)
const CENTER_TEXT_VERTICAL_OFFSET = 0.1; // em units - fine vertical adjustment for perfect centering

// ============================================================================
// Main Component
// ============================================================================

export function ChordCard({
	root,
	bottomLeft,
	bottomRight,
	value = '',
	holes,
	openStates,
	fluteType = 'Cm4',
	hideNotes = false,
	hideChordNumber = false,
	showLabels = false,
	ringRadius = DEFAULT_RING_RADIUS,
	ringRotationDeg = DEFAULT_RING_ROTATION_DEG,
	holeRadius = DEFAULT_HOLE_RADIUS,
	centerRadius = DEFAULT_CENTER_RADIUS,
	armRx = DEFAULT_ARM_THICKNESS,
	armRy = DEFAULT_ARM_LENGTH,
	fluid = false,
	pixelSize = 200,
	onClick,
	onPlay
}: ChordCardProps) {
	// Auto-calculate notes from openStates if provided and notes not explicitly given
	let finalRoot = root;
	let finalBottomLeft = bottomLeft;
	let finalBottomRight = bottomRight;
	
	if (openStates && openStates.length === 6 && (!root || !bottomLeft || !bottomRight) && !hideNotes) {
		const notes = getNotesFromOpenStates(openStates, fluteType);
		finalRoot = root || notes.front;      // Front chamber = top arm
		finalBottomLeft = bottomLeft || notes.left;   // Left chamber = left bottom arm
		finalBottomRight = bottomRight || notes.right; // Right chamber = right bottom arm
	}
	
	// Hide notes if requested
	if (hideNotes) {
		finalRoot = undefined;
		finalBottomLeft = undefined;
		finalBottomRight = undefined;
	}
	
	// Hide chord number if requested
	const displayValue = hideChordNumber ? '' : value;
	
	const handleClick = () => {
		if (onClick) {
			onClick();
		}
		if (onPlay && finalRoot && finalBottomLeft && finalBottomRight) {
			onPlay({
				left: finalBottomLeft,
				right: finalBottomRight,
				front: finalRoot
			});
		}
	};
	
	// Determine if card should be clickable
	const isClickable = onClick || onPlay
	
	return (
		<div 
			className={`chord-card${fluid ? ' chord-card--fluid' : ''}${isClickable ? ' chord-card--clickable' : ''}`}
			onClick={isClickable ? handleClick : undefined}
			onTouchEnd={(e) => {
				// iOS touch event handler - ensure clicks work on touch devices
				if (isClickable) {
					e.preventDefault()
					handleClick()
				}
			}}
			data-chord-active={false}
			style={{ 
				touchAction: 'manipulation', 
				WebkitTapHighlightColor: 'transparent',
				cursor: isClickable ? 'pointer' : 'default'
			}}
		>
			<svg
				className="fingering"
				viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
				preserveAspectRatio="xMidYMid meet"
				aria-label="Fingering diagram"
				style={fluid ? { width: pixelSize, height: pixelSize } : undefined}
				overflow="visible"
			>
				{(() => {
					const computedHoles = computeHoles(holes, openStates, ringRadius, ringRotationDeg);
					return (
						<>
							{renderArms(
								CENTER_X,
								CENTER_Y,
								ringRadius,
								holeRadius,
								centerRadius,
								ringRotationDeg,
								armRx,
								armRy,
								finalRoot,
								finalBottomLeft,
								finalBottomRight,
								showLabels
							)}

							{computedHoles.map((h, i) => (
								<circle key={i} cx={h.cx} cy={h.cy} r={holeRadius} data-open={h.open} />
							))}

							<circle
								cx={CENTER_X}
								cy={CENTER_Y}
								r={centerRadius}
								fill="white"
								stroke="black"
								strokeWidth="2"
							/>
							{renderCenterText(displayValue)}
							{/* Finger labels */}
							{showLabels && computedHoles.map((hole, i) => {
								const fingerNames = [
									'R Middle',   // rightUpper (middle)
									'R Thumb',    // rightLower (bottom)
									'L Thumb',    // leftLower (bottom)
									'L Middle',   // leftUpper (middle)
									'L Index',    // frontLeft (top)
									'R Index'     // frontRight (top)
								];
								
								// Calculate direction from center to hole
								const dx = hole.cx - CENTER_X;
								const dy = hole.cy - CENTER_Y;
								const distance = Math.sqrt(dx * dx + dy * dy);
								
								// Avoid division by zero
								if (distance === 0) return null;
								
								// Position label further out from the hole
								// Middle fingers need more distance
								const isMiddleFinger = i === 0 || i === 3; // R Middle or L Middle
								const isTopOrBottom = i === 1 || i === 2 || i === 4 || i === 5; // R Thumb, L Thumb, L Index, R Index
								let labelDistance = FINGER_LABEL_DISTANCE;
								if (isMiddleFinger) {
									labelDistance = FINGER_LABEL_DISTANCE + 12;
								} else if (isTopOrBottom) {
									labelDistance = FINGER_LABEL_DISTANCE + 3;
								}
								const x = hole.cx + (dx / distance) * labelDistance;
								const y = hole.cy + (dy / distance) * labelDistance;
								
								return (
									<text
										key={`finger-${i}`}
										data-finger-label="true"
										x={x}
										y={y}
										textAnchor="middle"
										dominantBaseline="middle"
										fontSize="7"
										fill="#000000"
										fontFamily="Arial, sans-serif"
										style={{ 
											pointerEvents: 'none', 
											userSelect: 'none',
											fontWeight: '600',
											opacity: '1',
											visibility: 'visible'
										}}
									>
										{fingerNames[i]}
									</text>
								);
							})}
						</>
					);
				})()}
			</svg>
		</div>
	);
}

// ============================================================================
// Rendering Functions
// ============================================================================

function renderCenterText(value: string) {
	if (!value) return null;
	return (
		<text
			x={CENTER_X}
			y={CENTER_Y}
			dy={`${CENTER_TEXT_VERTICAL_OFFSET}em`}
			textAnchor="middle"
			dominantBaseline="middle"
			className="fg-label fg-val"
		>
			{value}
		</text>
	);
}

function renderArms(
	cx: number,
	cy: number,
	_ringR: number,
	_holeR: number,
	_centerR: number,
	_rotationDeg: number,
	thickness: number,
	armLength: number,
	labelTop?: string,
	labelLeft?: string,
	labelRight?: string,
	showLabels: boolean = false
) {
	const innerR = 0; // Arms start from exact center of middle circle
	const outerR = innerR + armLength;
	const toRad = (deg: number) => (deg * Math.PI) / 180;

	return (
		<>
			{ARM_ANGLES.map((angleDeg, i) => {
				const angleRad = toRad(angleDeg);
				const x1 = cx + innerR * Math.cos(angleRad);
				const y1 = cy + innerR * Math.sin(angleRad);
				const x2 = cx + outerR * Math.cos(angleRad);
				const y2 = cy + outerR * Math.sin(angleRad);

				const midX = (x1 + x2) / 2;
				const midY = (y1 + y2) / 2;
				const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

				// Ellipse dimensions: narrow oval shape
				const ellipseRx = thickness * 0.75;
				const ellipseRy = lineLength / 2;

				return (
					<ellipse
						key={i}
						cx={midX}
						cy={midY}
						rx={ellipseRx}
						ry={ellipseRy}
						fill="black"
						transform={`rotate(${angleDeg + 90} ${midX} ${midY})`}
					/>
				);
			})}
			{renderLabel(cx, cy, outerR, -90, labelTop, 'fg-root', true)}
			{renderLabel(cx, cy, outerR, 150, labelLeft, 'fg-sub', false)}
			{renderLabel(cx, cy, outerR, 30, labelRight, 'fg-sub', false)}
			{/* Chamber labels at the end of arms */}
			{showLabels && (
				<>
					{renderChamberLabel(cx, cy, outerR, -90, 'Top Chamber', true)}
					{renderChamberLabel(cx, cy, outerR, 150, 'Left Chamber', false)}
					{renderChamberLabel(cx, cy, outerR, 30, 'Right Chamber', false)}
				</>
			)}
		</>
	);
}

function renderLabel(
	cx: number,
	cy: number,
	armEndRadius: number,
	armAngleDeg: number,
	label?: string,
	className: string = 'fg-label',
	isTop: boolean = false
) {
	if (!label) return null;

	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const angleRad = toRad(armAngleDeg);
	const textRadius = armEndRadius + LABEL_DISTANCE_FROM_ARM_END;
	
	// Apply vertical shift - extra shift for top label
	const verticalShift = isTop 
		? LABEL_VERTICAL_SHIFT + LABEL_TOP_VERTICAL_SHIFT 
		: LABEL_VERTICAL_SHIFT;
	
	const x = cx + textRadius * Math.cos(angleRad);
	const y = cy + textRadius * Math.sin(angleRad) + verticalShift;

	return (
		<text
			x={x}
			y={y}
			textAnchor="middle"
			dominantBaseline="middle"
			className={`fg-label ${className}`}
		>
			{label}
		</text>
	);
}

function renderChamberLabel(
	cx: number,
	cy: number,
	armEndRadius: number,
	armAngleDeg: number,
	label: string,
	isTop: boolean = false
) {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const angleRad = toRad(armAngleDeg);
	const textRadius = armEndRadius + CHAMBER_LABEL_DISTANCE_FROM_ARM_END;
	
	// Apply vertical shift - extra shift for top label (more upward)
	const verticalShift = isTop 
		? LABEL_VERTICAL_SHIFT + LABEL_TOP_VERTICAL_SHIFT - 12
		: LABEL_VERTICAL_SHIFT;
	
	// Horizontal offset for left and right labels to push them further to the sides
	const isLeft = armAngleDeg === 150;
	const isRight = armAngleDeg === 30;
	const horizontalOffset = isLeft ? -32 : isRight ? 32 : 0;
	
	const x = cx + textRadius * Math.cos(angleRad) + horizontalOffset;
	const y = cy + textRadius * Math.sin(angleRad) + verticalShift;
	
	// Calculate text width approximation for rectangle
	const textWidth = label.length * 5.5; // Approximate width per character
	const textHeight = 10;
	const padding = 2;
	const rectWidth = textWidth + padding * 2;
	const rectHeight = textHeight + padding * 2;

	return (
		<g>
			{/* Black rectangle background */}
			<rect
				x={x - rectWidth / 2}
				y={y - rectHeight / 2}
				width={rectWidth}
				height={rectHeight}
				fill="#000000"
				rx="2"
			/>
			{/* White text */}
			<text
				x={x}
				y={y}
				textAnchor="middle"
				dominantBaseline="middle"
				fontSize="9"
				fill="#FFFFFF"
				fontFamily="Arial, sans-serif"
				style={{ 
					pointerEvents: 'none', 
					userSelect: 'none',
					fontWeight: '600'
				}}
			>
				{label}
			</text>
		</g>
	);
}

// ============================================================================
// Helper Functions
// ============================================================================

function computeHoles(
	fromHoles?: Hole[],
	openStates?: boolean[],
	ringRadius?: number,
	rotationDeg: number = 0
): Hole[] {
	if (fromHoles && fromHoles.length === 6) return fromHoles;
	return generateCircleHoles(
		openStates ?? [false, false, false, false, false, false],
		ringRadius,
		rotationDeg
	);
}

function generateCircleHoles(
	openStates: boolean[],
	ringRadius: number = DEFAULT_RING_RADIUS,
	rotationDeg: number = 0
): Hole[] {
	const numHoles = 6;
	const startAngleDeg = -90 + rotationDeg; // Start at top (12 o'clock), then rotate
	const holes: Hole[] = [];

	for (let i = 0; i < numHoles; i++) {
		const angleRad = ((startAngleDeg + (360 / numHoles) * i) * Math.PI) / 180;
		holes.push({
			cx: CENTER_X + ringRadius * Math.cos(angleRad),
			cy: CENTER_Y + ringRadius * Math.sin(angleRad),
			open: !!openStates[i]
		});
	}

	return holes;
}

export default ChordCard;
